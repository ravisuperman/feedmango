/**
 * ============================================================
 * API - Data Fetching
 * ============================================================
 */

async function fetchSport(s) {
  try {
    const r = await fetch(WORKER + '/api/news?sport=' + s);
    const d = await r.json();
    let a = d.articles || [];
    
    if (s === 'ipl') {
      const re = /\b(ipl|csk|rcb|mi|kkr|srh|pbks|dc|rr|lsg|gt|dhoni|kohli|rohit|chennai|mumbai|tata|league|cricket|duckett)\b/i;
      a = a.filter(x => re.test((x.title + " " + (x.description || "")).toLowerCase()));
    }
    
    a.forEach(x => { if (!x.sport) x.sport = s; });
    return a;
  } catch(e) {
    console.error('Fetch error for ' + s + ':', e);
    return [];
  }
}
