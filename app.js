/* ── Config ──────────────────────────────────────────────────── */
const API_BASE = 'https://graph.facebook.com/v21.0/ads_archive';
const FIELDS = [
  'id', 'ad_creative_bodies', 'ad_creative_link_captions',
  'ad_creative_link_descriptions', 'ad_creative_link_titles',
  'page_name', 'page_id', 'ad_snapshot_url',
  'ad_delivery_start_time', 'ad_delivery_stop_time',
  'publisher_platforms', 'target_locations',
  'impressions', 'spend', 'currency'
].join(',');

/* ── State ───────────────────────────────────────────────────── */
let allAds = [];
let afterCursors = [null];
let currentPage = 0;
let isLoading = false;

/* ── Token management ────────────────────────────────────────── */
function getToken() {
  return localStorage.getItem('fb_ads_token') ||
    document.getElementById('tokenInput').value.trim();
}

function saveToken() {
  const val = document.getElementById('tokenInput').value.trim();
  if (!val) { showToast('Please enter a token first'); return; }
  localStorage.setItem('fb_ads_token', val);
  showToast('Token saved ✓');
}

window.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('fb_ads_token');
  if (saved) document.getElementById('tokenInput').value = saved;
  document.getElementById('searchInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') fetchAds();
  });
});

/* ── Fetch ───────────────────────────────────────────────────── */
async function fetchAds(resetPage = true) {
  if (isLoading) return;
  const token = getToken();
  if (!token) { showError('Please enter your Facebook Access Token in the sidebar.'); return; }

  if (resetPage) { afterCursors = [null]; currentPage = 0; allAds = []; }

  const q           = document.getElementById('searchInput').value.trim() || 'a';
  const country     = document.getElementById('countrySelect').value;
  const status      = document.getElementById('statusSelect').value;
  const media       = document.getElementById('mediaSelect').value;
  const limit       = document.getElementById('limitSelect').value;

  clearError();
  setLoading(true);

  const params = new URLSearchParams({
    search_terms: q,
    ad_type: 'ALL',
    ad_active_status: status,
    fields: FIELDS,
    limit,
    access_token: token
  });
  if (country !== 'ALL') params.set('ad_reached_countries', country);
  if (media !== 'all')   params.set('media_type', media);
  if (afterCursors[currentPage]) params.set('after', afterCursors[currentPage]);

  try {
    const res  = await fetch(`${API_BASE}?${params}`);
    const data = await res.json();

    if (data.error) {
      showError(`API Error ${data.error.code}: ${data.error.message}`);
      setLoading(false);
      renderAds([]);
      return;
    }

    allAds = data.data || [];

    if (data.paging?.cursors?.after && !afterCursors[currentPage + 1]) {
      afterCursors[currentPage + 1] = data.paging.cursors.after;
    }

    updateMetrics(allAds);
    sortAndRender();
    updatePagination();
    document.getElementById('lastUpdated').textContent =
      'Updated ' + new Date().toLocaleTimeString();
  } catch (err) {
    showError('Network error: ' + err.message);
    renderAds([]);
  }

  setLoading(false);
}

/* ── Sort ────────────────────────────────────────────────────── */
function sortAndRender() {
  const sort = document.getElementById('sortSelect').value;
  const sorted = [...allAds];
  if (sort === 'date_desc') {
    sorted.sort((a, b) => (b.ad_delivery_start_time || '') > (a.ad_delivery_start_time || '') ? 1 : -1);
  } else if (sort === 'date_asc') {
    sorted.sort((a, b) => (a.ad_delivery_start_time || '') > (b.ad_delivery_start_time || '') ? 1 : -1);
  } else if (sort === 'page_asc') {
    sorted.sort((a, b) => (a.page_name || '').localeCompare(b.page_name || ''));
  }
  renderAds(sorted);
}

/* ── Render ──────────────────────────────────────────────────── */
function renderAds(ads) {
  const container = document.getElementById('adsContainer');
  const count     = document.getElementById('resultsCount');

  if (!ads || ads.length === 0) {
    count.textContent = '';
    container.innerHTML = `
      <div class="empty-state">
        <i class="ti ti-mood-empty"></i>
        <p>No ads found. Try a different keyword or country.</p>
      </div>`;
    return;
  }

  count.textContent = `${ads.length} ads on this page`;

  container.innerHTML = ads.map(ad => {
    const body     = getBody(ad);
    const isActive = !ad.ad_delivery_stop_time;
    const start    = fmtDate(ad.ad_delivery_start_time);
    const stop     = ad.ad_delivery_stop_time ? fmtDate(ad.ad_delivery_stop_time) : 'now';
    const platforms= (ad.publisher_platforms || []).slice(0, 3);
    const initials = (ad.page_name || '?').charAt(0).toUpperCase();
    const imp      = fmtRange(ad.impressions);
    const spend    = fmtRange(ad.spend);

    return `
    <div class="ad-card">
      <div class="ad-card-header">
        <div class="ad-page-info">
          <div class="ad-avatar">${initials}</div>
          <div>
            <div class="ad-page-name">${esc(ad.page_name || 'Unknown page')}</div>
            <div class="ad-id">ID: ${ad.id}</div>
          </div>
        </div>
        <div class="ad-badges">
          <span class="badge ${isActive ? 'badge-active' : 'badge-inactive'}">
            ${isActive ? '● Active' : '○ Inactive'}
          </span>
          ${platforms.map(p => `<span class="badge badge-platform">${esc(p)}</span>`).join('')}
        </div>
      </div>

      ${body ? `<div class="ad-body">${esc(body)}</div>` : ''}

      <div class="ad-footer">
        <div class="ad-meta">
          <div class="ad-meta-item">
            <i class="ti ti-calendar"></i>
            <span>${start} → ${stop}</span>
          </div>
          ${imp ? `<div class="ad-meta-item">
            <i class="ti ti-eye"></i>
            <strong>${imp}</strong><span>impressions</span>
          </div>` : ''}
          ${spend ? `<div class="ad-meta-item">
            <i class="ti ti-coin"></i>
            <strong>${spend}</strong><span>USD spent</span>
          </div>` : ''}
        </div>
        <div class="ad-actions">
          ${ad.ad_snapshot_url
            ? `<a class="btn-sm blue" href="${esc(ad.ad_snapshot_url)}" target="_blank" rel="noopener">
                <i class="ti ti-external-link"></i> View ad
               </a>`
            : ''}
        </div>
      </div>
    </div>`;
  }).join('');
}

/* ── Metrics ─────────────────────────────────────────────────── */
function updateMetrics(ads) {
  const active    = ads.filter(a => !a.ad_delivery_stop_time).length;
  const pages     = new Set(ads.map(a => a.page_id)).size;
  const platforms = new Set(ads.flatMap(a => a.publisher_platforms || [])).size;

  document.getElementById('metTotal').textContent     = ads.length;
  document.getElementById('metActive').textContent    = active;
  document.getElementById('metPages').textContent     = pages;
  document.getElementById('metPlatforms').textContent = platforms || '—';
}

/* ── Pagination ──────────────────────────────────────────────── */
function changePage(dir) {
  currentPage += dir;
  fetchAds(false);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updatePagination() {
  const row     = document.getElementById('paginationRow');
  const hasNext = !!afterCursors[currentPage + 1];
  const hasPrev = currentPage > 0;

  if (hasNext || hasPrev) {
    row.style.display = 'flex';
    document.getElementById('prevBtn').disabled = !hasPrev;
    document.getElementById('nextBtn').disabled = !hasNext;
    document.getElementById('pageInfo').textContent = `Page ${currentPage + 1}`;
  } else {
    row.style.display = 'none';
  }
}

/* ── Export CSV ──────────────────────────────────────────────── */
function exportCSV() {
  if (!allAds.length) { showToast('No ads to export. Run a search first.'); return; }

  const headers = [
    'ID','Page Name','Status','Start Date','End Date',
    'Ad Body','Platforms','Impressions Low','Impressions High',
    'Spend Low','Spend High','Currency','Snapshot URL'
  ];

  const rows = allAds.map(ad => [
    ad.id,
    ad.page_name || '',
    ad.ad_delivery_stop_time ? 'Inactive' : 'Active',
    ad.ad_delivery_start_time || '',
    ad.ad_delivery_stop_time  || '',
    getBody(ad),
    (ad.publisher_platforms || []).join('|'),
    ad.impressions?.lower_bound || '',
    ad.impressions?.upper_bound || '',
    ad.spend?.lower_bound || '',
    ad.spend?.upper_bound || '',
    ad.currency || '',
    ad.ad_snapshot_url || ''
  ].map(v => `"${String(v).replace(/"/g, '""')}"`));

  const csv  = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `ads_library_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('CSV exported ✓');
}

/* ── Helpers ─────────────────────────────────────────────────── */
function getBody(ad) {
  return (ad.ad_creative_bodies?.[0])
    || (ad.ad_creative_link_titles?.[0])
    || (ad.ad_creative_link_descriptions?.[0])
    || '';
}

function fmtDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
}

function fmtRange(obj) {
  if (!obj) return '';
  const lo = obj.lower_bound ? Number(obj.lower_bound).toLocaleString() : null;
  const hi = obj.upper_bound ? Number(obj.upper_bound).toLocaleString() : null;
  if (lo && hi) return `${lo}–${hi}`;
  if (lo)       return `${lo}+`;
  return '';
}

function esc(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function setLoading(on) {
  isLoading = on;
  if (on) {
    document.getElementById('adsContainer').innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <div>Loading ads from Facebook...</div>
      </div>`;
  }
}

function showError(msg) {
  const el = document.getElementById('errorBox');
  el.textContent = msg;
  el.style.display = 'flex';
}
function clearError() {
  const el = document.getElementById('errorBox');
  el.style.display = 'none';
}

let toastTimer;
function showToast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  clearTimeout(toastTimer);
  requestAnimationFrame(() => { t.classList.add('show'); });
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}
