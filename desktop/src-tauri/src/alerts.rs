//! Frost and wind alerts in the background.
//!
//! Every 3 hours (and right away when the farm changes) Rust asks the Open-Meteo forecast for the farm's
//! location and sends a system notification for frost tonight / tomorrow night or strong wind gusts.
//! The farm (lat, lon, name, language) comes from the web app through the `set_farm` command and is saved
//! in the app's config folder, so alerts keep working after a restart even before the web loads.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::mpsc::{Receiver, RecvTimeoutError, Sender};
use std::sync::{Arc, Mutex};
use std::time::Duration;

pub const EVERY: Duration = Duration::from_secs(3 * 60 * 60);
const FROST_C: f64 = 0.0;
const HARD_FROST_C: f64 = -3.0;
const WIND_KMH: f64 = 60.0;

#[derive(Clone, Debug, Default, Serialize, Deserialize, PartialEq)]
pub struct Farm {
    pub lat: f64,
    pub lon: f64,
    pub name: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Settings {
    pub farm: Option<Farm>,
    pub lang: String,
    pub alerts: bool,
    /// alerts already sent (date + kind), so each one is sent once
    pub sent: Vec<String>,
    /// the "Growvia keeps running next to the clock" tip was shown
    pub tray_tip: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Settings { farm: None, lang: "es".into(), alerts: true, sent: vec![], tray_tip: false }
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct Day {
    pub date: String,
    pub tmin: f64,
    pub gust: f64,
}

#[derive(Clone, Debug, PartialEq)]
pub struct Alert {
    pub key: String,
    pub title: String,
    pub body: String,
}

/// What the tray shows and the last check found.
#[derive(Clone, Debug, Default)]
pub struct Status {
    pub tonight: Option<f64>,
    pub error: Option<String>,
}

pub struct Shared {
    pub settings: Mutex<Settings>,
    pub status: Mutex<Status>,
    pub path: PathBuf,
    pub wake: Mutex<Sender<()>>,
}

impl Shared {
    pub fn load(path: PathBuf, wake: Sender<()>) -> Arc<Shared> {
        let settings = std::fs::read_to_string(&path).ok().and_then(|t| serde_json::from_str(&t).ok()).unwrap_or_default();
        Arc::new(Shared { settings: Mutex::new(settings), status: Mutex::new(Status::default()), path, wake: Mutex::new(wake) })
    }
    pub fn save(&self) {
        if let Some(dir) = self.path.parent() {
            let _ = std::fs::create_dir_all(dir);
        }
        if let Ok(t) = serde_json::to_string_pretty(&*self.settings.lock().unwrap()) {
            let _ = std::fs::write(&self.path, t);
        }
    }
    /// Check the forecast now (instead of waiting for the next 3-hour turn).
    pub fn check_now(&self) {
        let _ = self.wake.lock().unwrap().send(());
    }
}

/// Forecast endpoint (Open-Meteo, no key). `GROWVIA_FORECAST_URL` replaces it for testing.
pub fn forecast_url(f: &Farm) -> String {
    let base = std::env::var("GROWVIA_FORECAST_URL").unwrap_or_else(|_| "https://api.open-meteo.com/v1/forecast".into());
    format!("{base}?latitude={:.3}&longitude={:.3}&daily=temperature_2m_min,wind_gusts_10m_max&timezone=auto&forecast_days=3", f.lat, f.lon)
}

#[derive(Deserialize)]
struct Daily {
    time: Vec<String>,
    temperature_2m_min: Vec<Option<f64>>,
    wind_gusts_10m_max: Vec<Option<f64>>,
}
#[derive(Deserialize)]
struct Forecast {
    daily: Daily,
}

pub fn parse(json: &str) -> Result<Vec<Day>, String> {
    let f: Forecast = serde_json::from_str(json).map_err(|e| e.to_string())?;
    Ok(f.daily.time.iter().enumerate().map(|(i, d)| Day {
        date: d.clone(),
        tmin: f.daily.temperature_2m_min.get(i).copied().flatten().unwrap_or(f64::NAN),
        gust: f.daily.wind_gusts_10m_max.get(i).copied().flatten().unwrap_or(0.0),
    }).collect())
}

pub fn fetch(f: &Farm) -> Result<Vec<Day>, String> {
    let body = ureq::get(&forecast_url(f)).timeout(Duration::from_secs(20)).call().map_err(|e| e.to_string())?.into_string().map_err(|e| e.to_string())?;
    parse(&body)
}

/// The coldest point of "tonight" is tomorrow's minimum (it happens at dawn).
pub fn tonight(days: &[Day]) -> Option<f64> {
    days.get(1).map(|d| d.tmin).filter(|t| t.is_finite())
}

/// Alerts for tonight (tomorrow's dawn) and tomorrow night, plus strong wind today and tomorrow.
pub fn alerts(days: &[Day], farm: &str, es: bool) -> Vec<Alert> {
    let mut out = vec![];
    for (i, d) in days.iter().enumerate().skip(1).take(2) {
        if d.tmin.is_finite() && d.tmin <= FROST_C {
            let when = match (i, es) { (1, true) => "esta noche", (1, false) => "tonight", (_, true) => "mañana a la noche", (_, false) => "tomorrow night" };
            let hard = d.tmin <= HARD_FROST_C;
            out.push(Alert {
                key: format!("{}-frost", d.date),
                title: if es { format!("{} helada {when} en {farm}: {:.0} °C", if hard { "Fuerte" } else { "Posible" }, d.tmin) } else { format!("{} frost {when} at {farm}: {:.0} °C", if hard { "Hard" } else { "Possible" }, d.tmin) },
                body: if es { "Protegé lo que está en flor: riego o aspersión antes del amanecer, mantas térmicas y revisá el plan de contingencias en Growvia.".into() } else { "Protect what is in bloom: irrigate or sprinkle before dawn, use frost cloth and check the contingency plan in Growvia.".into() },
            });
        }
    }
    for (i, d) in days.iter().enumerate().take(2) {
        if d.gust >= WIND_KMH {
            let when = match (i, es) { (0, true) => "hoy", (0, false) => "today", (_, true) => "mañana", (_, false) => "tomorrow" };
            out.push(Alert {
                key: format!("{}-wind", d.date),
                title: if es { format!("Viento fuerte {when} en {farm}: ráfagas de {:.0} km/h", d.gust) } else { format!("Strong wind {when} at {farm}: gusts of {:.0} km/h", d.gust) },
                body: if es { "Evitá pulverizar y sembrar, asegurá túneles y mallas, y mantené el suelo cubierto.".into() } else { "Avoid spraying and sowing, secure tunnels and nets, and keep the soil covered.".into() },
            });
        }
    }
    out
}

/// One check: forecast → status for the tray → new alerts (not sent before).
pub fn check(shared: &Shared) -> Vec<Alert> {
    let (farm, es, on) = {
        let s = shared.settings.lock().unwrap();
        (s.farm.clone(), s.lang != "en", s.alerts)
    };
    let Some(farm) = farm else { return vec![] };
    match fetch(&farm) {
        Ok(days) => {
            *shared.status.lock().unwrap() = Status { tonight: tonight(&days), error: None };
            if !on {
                return vec![];
            }
            let name = if farm.name.trim().is_empty() { "tu chacra".to_string() } else { farm.name.clone() };
            let mut s = shared.settings.lock().unwrap();
            let new: Vec<Alert> = alerts(&days, &name, es).into_iter().filter(|a| !s.sent.contains(&a.key)).collect();
            s.sent.extend(new.iter().map(|a| a.key.clone()));
            let n = s.sent.len();
            if n > 60 {
                s.sent.drain(0..n - 60);
            }
            drop(s);
            if !new.is_empty() {
                shared.save();
            }
            new
        }
        Err(e) => {
            shared.status.lock().unwrap().error = Some(e);
            vec![]
        }
    }
}

/// Background loop: checks now, then every 3 hours or when woken up (farm changed, "check now").
pub fn run_loop(shared: Arc<Shared>, wake: Receiver<()>, on_result: impl Fn(&[Alert], &Status) + Send + 'static) {
    std::thread::spawn(move || loop {
        let new = check(&shared);
        let status = shared.status.lock().unwrap().clone();
        on_result(&new, &status);
        match wake.recv_timeout(EVERY) {
            Ok(()) | Err(RecvTimeoutError::Timeout) => continue,
            Err(RecvTimeoutError::Disconnected) => break,
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    const SAMPLE: &str = r#"{"daily":{"time":["2026-11-15","2026-11-16","2026-11-17"],
      "temperature_2m_min":[2.1,-3.4,0.4],"wind_gusts_10m_max":[72.0,40.0,30.0]}}"#;

    #[test]
    fn parses_open_meteo() {
        let d = parse(SAMPLE).unwrap();
        assert_eq!(d.len(), 3);
        assert_eq!(d[1].tmin, -3.4);
        assert_eq!(tonight(&d), Some(-3.4));
    }

    #[test]
    fn frost_tonight_and_wind_today() {
        let a = alerts(&parse(SAMPLE).unwrap(), "La Chacra", true);
        assert_eq!(a.len(), 2);
        assert!(a[0].title.starts_with("Fuerte helada esta noche en La Chacra: -3 °C"));
        assert_eq!(a[0].key, "2026-11-16-frost");
        assert!(a[1].title.contains("ráfagas de 72 km/h"));
        assert_eq!(a[1].key, "2026-11-15-wind");
    }

    #[test]
    fn no_alerts_on_a_calm_warm_week() {
        let calm = r#"{"daily":{"time":["a","b","c"],"temperature_2m_min":[8,7,6],"wind_gusts_10m_max":[20,25,30]}}"#;
        assert!(alerts(&parse(calm).unwrap(), "x", false).is_empty());
    }

    #[test]
    fn missing_values_do_not_alert() {
        let gaps = r#"{"daily":{"time":["a","b"],"temperature_2m_min":[null,null],"wind_gusts_10m_max":[null,null]}}"#;
        let d = parse(gaps).unwrap();
        assert!(alerts(&d, "x", true).is_empty());
        assert_eq!(tonight(&d), None);
    }
}
