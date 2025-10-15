
(function ($) {
    'use strict';

    // Initialize when document is ready
    $(document).ready(function () {
        console.log('System Monitor initialized');

       
        // Optional: Add real-time clock
        function updateClock() {
            const now = new Date();
            const timeString = now.toLocaleTimeString();
            $('#current-time').text(timeString);
        }

        // Update clock every second if element exists
        if ($('#current-time').length) {
            updateClock();
            setInterval(updateClock, 1000);
        }
    });

})(jQuery);

// Debounce helper to limit rapid calls
function debounce(fn, delay) {
    let t;
    return function (...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), delay);
    };
}

function setSearchLoading(isLoading) {
    const spinner = document.getElementById('modelSearchSpinner');
    const select = document.getElementById('modelSelect');
    if (spinner) spinner.classList.toggle('d-none', !isLoading);
    if (select) select.disabled = isLoading;
}

function updateModelFilterNote(text) {
    const el = document.getElementById('modelFilterNote');
    if (!el) return;
    el.textContent = text || '';
}

function isQuantizedTag(t) {
    if (!t) return false;
    const s = String(t).toLowerCase();
    return (
        s.includes('gguf') || s.includes('ggml') ||
        s.includes('gptq') || s.includes('awq') ||
        s.includes('exl2') || s.includes('exllama') ||
        s.includes('int4') || s.includes('int8') ||
        s.includes('quant')
    );
}

function isAdapterTag(t) {
    if (!t) return false;
    const s = String(t).toLowerCase();
    return (
        s === 'lora' || s.includes('lora-') ||
        s.includes('qlora') || s.includes('peft') ||
        s.includes('adapter') || s.includes('mergekit') ||
        s.includes('delta')
    );
}

function isModelLikelyFineTunable(model) {
    const tags = Array.isArray(model?.tags) ? model.tags.map(x => String(x).toLowerCase()) : [];
    const id = String(model?.modelId || model?.id || '');
    const lib = String(model?.library_name || '').toLowerCase();
    // Require transformers ecosystem
    const okLib = lib === 'transformers' || tags.includes('transformers');
    if (!okLib) return false;
    // Exclude quantized/llama.cpp formats and LoRA/adapter-only repos
    if (tags.some(isQuantizedTag)) return false;
    if (tags.some(isAdapterTag)) return false;
    // Exclude obvious quantized naming patterns
    const nameLower = id.toLowerCase();
    if (/(gguf|ggml|gptq|awq|exl2|exllama|int4|int8)/.test(nameLower)) return false;
    return true;
}

function filterFineTunableModels(models) {
    const res = [];
    let dropped = 0;
    for (const m of (models || [])) {
        if (isModelLikelyFineTunable(m)) res.push(m); else dropped++;
    }
    // Prefer base-like names first (no -it/-instruct/-chat), but keep others if valid
    res.sort((a, b) => {
        const ida = String(a.modelId || a.id || '').toLowerCase();
        const idb = String(b.modelId || b.id || '').toLowerCase();
        const score = s => (/(\b|-)(it|instruct|chat)(\b|-)*/.test(s) ? 1 : 0);
        return score(ida) - score(idb);
    });
    return { list: res, dropped };
}
function showToast(message, variant = 'dark') {
    try {
        const toastEl = document.getElementById('liveToast');
        const toastBody = document.getElementById('toastBody');
        if (!toastEl || !toastBody || typeof bootstrap === 'undefined') return;
        toastBody.textContent = message || '';
        // reset variant class
        toastEl.classList.remove('text-bg-dark', 'text-bg-success', 'text-bg-warning', 'text-bg-danger', 'text-bg-info');
        const cls = `text-bg-${variant}`;
        toastEl.classList.add(cls);
        const toast = bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 2000 });
        toast.show();
    } catch (e) { console.warn('Toast error:', e); }
}

function getQueryParam(name) {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
}

function getSavedSelectionState() {
    try {
        const raw = localStorage.getItem('ftx.selectedModel');
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (_) { return null; }
}

function buildAttributionSnippetFromState(state) {
    if (!state || !state.id) return '';
    const id = state.id;
    const license = state.license || '-';
    const licName = normalizeLicenseName(license) || license;
    const link = `https://huggingface.co/${id}`;
    const lines = [
        'Atribusi Model AI',
        `Model: ${id}`,
        `Lisensi: ${licName}${license && licName.toLowerCase() !== license.toLowerCase() ? ` (${license})` : ''}`,
        `Sumber: ${link}`,
        'Catatan: Gunakan sesuai ketentuan lisensi. Sertakan file LICENSE/NOTICE dan atribusi pada produk/README.'
    ];
    return lines.join('\n');
}

function renderModelSelectionSummaryOnPrivacy() {
    const el = document.getElementById('modelSelectionSummary');
    if (!el) return;

    // priority: localStorage → query param
    let state = getSavedSelectionState();
    const qId = getQueryParam('modelId');
    if (!state && qId) {
        state = { id: qId, label: (qId.includes('/') ? qId.split('/')[1] : qId), license: '-', ackLicense: false, ackAttribution: false };
    }

    if (!state || !state.id) {
        el.innerHTML = `
        <div class="card bg-dark text-light border-0">
          <div class="card-body">
            <h5 class="card-title mb-2">Ringkasan Pemilihan Model</h5>
            <p class="text-secondary mb-0 small">Tidak ada model yang tersimpan. Silakan kembali ke halaman "New Setup Training" untuk memilih model.</p>
          </div>
        </div>`;
        return;
    }

    const sizeB = extractModelSizeB(state.id);
    const warnResource = sizeB !== null && sizeB > 7;
    const ackComplete = !!(state.ackLicense && state.ackAttribution);
    const hfLink = `https://huggingface.co/${state.id}`;

    const resourceHtml = warnResource ? `
      <div class="alert alert-warning py-2 small mb-2" role="alert">
        Model di atas 7B terpilih. Pastikan GPU ≥16GB atau CPU ≥24 core.
      </div>` : '';

    el.innerHTML = `
    <div class="card bg-dark text-light border-0">
      <div class="card-body">
        <h5 class="card-title mb-2">Ringkasan Pemilihan Model</h5>
        <div class="mb-2 small">Model: <strong>${state.label || state.id}</strong></div>
        <div class="mb-2 small">ID: <code>${state.id}</code></div>
        <div class="mb-2 small">Lisensi: <strong>${state.license || '-'}</strong></div>
        <div class="mb-2 small">Acknowledgment: ${ackComplete ? '<span class="badge bg-success">Lengkap</span>' : '<span class="badge bg-secondary">Belum Lengkap</span>'}</div>
        ${resourceHtml}
        <div class="d-flex gap-2 mt-2">
          <a href="/Home/SetupModel" class="btn btn-outline-warning btn-sm">Ganti Model</a>
          <a href="${hfLink}" class="btn btn-outline-info btn-sm" target="_blank">Lihat di Hugging Face</a>
          <button type="button" id="btnCopyAttributionSummary" class="btn btn-outline-light btn-sm">Copy Atribusi</button>
        </div>
      </div>
    </div>`;
}

function populateModelSelect(options) {
    const $select = $('#modelSelect');
    if (!$select.length) return;

    const previous = $select.val();
    $select.empty();
    $select.append('<option value="">Pilih model...</option>');

    options.forEach(opt => {
        const text = opt.label || opt.id || '';
        const value = opt.id || text;
        $select.append($('<option>', { value, text }));
    });

    // Ensure both property and attribute reflect enabled/disabled
    const shouldDisable = options.length === 0;
    $select.prop('disabled', shouldDisable);
    if (shouldDisable) {
        $select.attr('disabled', 'disabled');
    } else {
        $select.removeAttr('disabled');
    }
    if (options.length === 0) {
        $select.find('option:first').text('Tidak ada hasil. Ubah kata kunci.');
    }

    // Try to preserve selection if still available
    if (previous && $select.find(`option[value='${previous.replace(/'/g, "\\'")}']`).length) {
        $select.val(previous);
    }
}

// Extract max size in B (e.g., 3.5B -> 3.5) from text
function extractModelSizeB(text) {
    if (!text) return null;
    const matches = [...text.matchAll(/(\d+(?:\.\d+)?)\s*[bB]\b/g)];
    if (!matches.length) return null;
    const sizes = matches.map(m => parseFloat(m[1])).filter(n => !isNaN(n));
    if (!sizes.length) return null;
    return Math.max(...sizes);
}

function validateSelectedModelSize() {
    const $sel = $('#modelSelect');
    const $alert = $('#modelSizeAlert');
    if (!$sel.length) return;

    const text = $sel.find('option:selected').text();
    const sizeB = extractModelSizeB(text);
    // Show alert only when strictly greater than 7B
    const shouldWarn = sizeB !== null && sizeB > 7;
    if (shouldWarn) {
        $alert.removeClass('d-none');
    } else {
        $alert.addClass('d-none');
    }
}

// Cache for latest search results: id -> model json
window.__hfModelCache = window.__hfModelCache || {};

function upsertModelCache(models) {
    if (!models || !Array.isArray(models)) return;
    models.forEach(m => {
        const rawId = m && (m.modelId || m.id || m.name);
        if (!rawId) return;
        const id = String(rawId);
        window.__hfModelCache[id] = m;
    });
}

function numberFmt(n) {
    try { return new Intl.NumberFormat('id-ID').format(n); } catch { return String(n); }
}

function pickLicenseFromTags(tags) {
    if (!Array.isArray(tags)) return null;
    const lic = tags.find(t => typeof t === 'string' && t.startsWith('license:'));
    return lic ? lic.replace('license:', '') : null;
}

function pickBaseModelFromTags(tags) {
    if (!Array.isArray(tags)) return null;
    const base = tags.find(t => typeof t === 'string' && (t.startsWith('base_model:') || t.startsWith('base_model:finetune:')));
    if (!base) return null;
    return base.replace('base_model:finetune:', '').replace('base_model:', '');
}

function friendlyPipelineTag(tag) {
    switch (tag) {
        case 'text-generation': return 'Menghasilkan teks (Text Generation)';
        case 'conversational': return 'Percakapan (Chat)';
        default: return tag || '-';
    }
}

function friendlyLibrary(lib) {
    switch (lib) {
        case 'transformers': return 'Transformers (Python)';
        default: return lib || '-';
    }
}

function slugifyId(str) {
    return (str || '').toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function normalizeLicenseName(lic) {
    if (!lic) return '';
    const s = String(lic).toLowerCase();
    if (s.includes('apache')) return 'apache-2.0';
    if (s === 'mit') return 'mit';
    if (s.includes('bsd') && s.includes('3')) return 'bsd-3-clause';
    if (s.includes('agpl')) return 'agpl-3.0';
    if (s.includes('gpl')) return 'gpl-3.0';
    if (s.includes('cc-by-nc')) return 'cc-by-nc-4.0';
    if (s.includes('cc-by-sa')) return 'cc-by-sa-4.0';
    if (s.includes('cc-by')) return 'cc-by-4.0';
    if (s.includes('openrail')) return 'openrail';
    if (s.includes('rail')) return 'openrail';
    if (s.includes('llama')) return 'llama';
    if (s.includes('gemma')) return 'gemma';
    return s;
}

function licenseSpdxLink(slug) {
    switch (slug) {
        case 'apache-2.0': return 'https://spdx.org/licenses/Apache-2.0.html';
        case 'mit': return 'https://spdx.org/licenses/MIT.html';
        case 'bsd-3-clause': return 'https://spdx.org/licenses/BSD-3-Clause.html';
        case 'gpl-3.0': return 'https://spdx.org/licenses/GPL-3.0-only.html';
        case 'agpl-3.0': return 'https://spdx.org/licenses/AGPL-3.0-only.html';
        case 'cc-by-4.0': return 'https://spdx.org/licenses/CC-BY-4.0.html';
        case 'cc-by-sa-4.0': return 'https://spdx.org/licenses/CC-BY-SA-4.0.html';
        case 'cc-by-nc-4.0': return 'https://spdx.org/licenses/CC-BY-NC-4.0.html';
        default: return null;
    }
}

function licenseDetails(slug) {
    const s = normalizeLicenseName(slug);
    const fallback = {
        name: slug || '-',
        allowed: [
            'Penggunaan pribadi dan penelitian biasanya diperbolehkan',
            'Beberapa lisensi mengizinkan penggunaan komersial, beberapa membatasi',
        ],
        conditions: [
            'Baca ketentuan di halaman model untuk memastikan kepatuhan',
        ],
        warnings: [
            'Lisensi khusus vendor bisa memiliki batasan tambahan (AUP/acceptable use policy)',
        ],
        recommendations: [
            'Simpan salinan lisensi bersama proyek Anda',
            'Cantumkan atribusi pada README/halaman produk',
        ],
        link: null,
    };

    switch (s) {
        case 'apache-2.0':
            return {
                name: 'Apache License 2.0',
                allowed: [
                    'Boleh untuk penggunaan pribadi dan komersial',
                    'Boleh dimodifikasi dan didistribusikan',
                    'Termasuk perlindungan paten (patent grant) dari kontributor',
                ],
                conditions: [
                    'Cantumkan lisensi dan pemberitahuan (NOTICE) saat distribusi',
                    'Sertakan perubahan yang Anda buat di catatan (jika ada)',
                    'Tidak ada jaminan dan tanggung jawab (as is, no warranty)',
                ],
                warnings: [
                    'Pastikan menyertakan berkas LICENSE/NOTICE ketika mendistribusikan',
                ],
                recommendations: [
                    'Tambahkan bagian “Lisensi” dan “Atribusi” pada README',
                    'Simpan salinan LICENSE dan NOTICE di repositori/deployable',
                ],
                link: licenseSpdxLink(s),
            };
        case 'mit':
            return {
                name: 'MIT License',
                allowed: [
                    'Boleh untuk penggunaan pribadi dan komersial',
                    'Boleh dimodifikasi, digabungkan, didistribusikan, dan diprivatisasi',
                ],
                conditions: [
                    'Cantumkan copyright dan teks lisensi',
                    'Tidak ada jaminan dan tanggung jawab (as is)',
                ],
                warnings: [
                    'Tidak ada perlindungan paten eksplisit seperti Apache-2.0',
                ],
                recommendations: [
                    'Sertakan file LICENSE dan atribusi pada dokumentasi',
                ],
                link: licenseSpdxLink(s),
            };
        case 'bsd-3-clause':
            return {
                name: 'BSD 3-Clause',
                allowed: [
                    'Boleh untuk penggunaan pribadi dan komersial',
                    'Boleh dimodifikasi dan didistribusikan',
                ],
                conditions: [
                    'Cantumkan hak cipta, daftar syarat, dan disclaimer',
                    'Tidak boleh menggunakan nama pemegang hak cipta untuk promosi tanpa izin',
                ],
                warnings: [
                    'Perhatikan klausul “no endorsement” saat marketing/branding',
                ],
                recommendations: [
                    'Sertakan file LICENSE dan atribusi',
                ],
                link: licenseSpdxLink(s),
            };
        case 'gpl-3.0':
            return {
                name: 'GNU GPL v3',
                allowed: [
                    'Penggunaan pribadi dan komersial diperbolehkan',
                    'Distribusi derivatif wajib tetap GPLv3 (copyleft)',
                ],
                conditions: [
                    'Jika mendistribusikan, wajib membuka sumber kode (copyleft)',
                    'Cantumkan lisensi dan pemberitahuan',
                ],
                warnings: [
                    'Tidak cocok jika Anda ingin mendistribusikan sebagai closed-source',
                ],
                recommendations: [
                    'Pertimbangkan kompatibilitas lisensi dengan kode Anda',
                ],
                link: licenseSpdxLink(s),
            };
        case 'agpl-3.0':
            return {
                name: 'GNU AGPL v3',
                allowed: [
                    'Penggunaan pribadi dan komersial diperbolehkan',
                    'Distribusi/penyediaan layanan jaringan mewajibkan sumber terbuka',
                ],
                conditions: [
                    'Jika aplikasi digunakan lewat jaringan (SaaS), wajib membuka sumber',
                    'Cantumkan lisensi dan pemberitahuan',
                ],
                warnings: [
                    'Ketentuan “network use” lebih ketat dari GPLv3',
                ],
                recommendations: [
                    'Pastikan kebijakan perusahaan kompatibel dengan AGPL',
                ],
                link: licenseSpdxLink(s),
            };
        case 'cc-by-4.0':
            return {
                name: 'Creative Commons BY 4.0',
                allowed: [
                    'Penggunaan ulang dan distribusi diperbolehkan (termasuk komersial)',
                ],
                conditions: [
                    'Wajib mencantumkan atribusi yang sesuai',
                ],
                warnings: [
                    'Pastikan atribusi jelas pada produk/halaman rilis',
                ],
                recommendations: [
                    'Sertakan bagian “Atribusi” yang eksplisit',
                ],
                link: licenseSpdxLink(s),
            };
        case 'cc-by-sa-4.0':
            return {
                name: 'Creative Commons BY-SA 4.0',
                allowed: [
                    'Penggunaan ulang dan distribusi diperbolehkan (termasuk komersial)',
                ],
                conditions: [
                    'Wajib mencantumkan atribusi',
                    'Wajib mendistribusikan derivatif dengan lisensi yang sama (ShareAlike)',
                ],
                warnings: [
                    'ShareAlike mempengaruhi kompatibilitas lisensi proyek Anda',
                ],
                recommendations: [
                    'Pertimbangkan implikasi ShareAlike sebelum produksi',
                ],
                link: licenseSpdxLink(s),
            };
        case 'cc-by-nc-4.0':
            return {
                name: 'Creative Commons BY-NC 4.0',
                allowed: [
                    'Penggunaan pribadi dan non-komersial diperbolehkan',
                ],
                conditions: [
                    'Wajib mencantumkan atribusi',
                    'Tidak boleh untuk penggunaan komersial',
                ],
                warnings: [
                    'Tidak cocok untuk produk komersial/berbayar',
                ],
                recommendations: [
                    'Gunakan hanya untuk riset/pribadi; hindari produksi komersial',
                ],
                link: licenseSpdxLink(s),
            };
        case 'openrail':
            return {
                name: 'OpenRAIL (varian)',
                allowed: [
                    'Penggunaan luas sering diperbolehkan',
                ],
                conditions: [
                    'Patuhi Acceptable Use Policy (AUP) spesifik varian RAIL',
                    'Atribusi biasanya diwajibkan',
                ],
                warnings: [
                    'Ada daftar penggunaan yang dilarang (mis. penyalahgunaan tertentu)',
                ],
                recommendations: [
                    'Baca dokumen RAIL dan AUP varian yang digunakan',
                ],
                link: null,
            };
        case 'llama':
            return {
                name: 'LLaMA Family (custom)',
                allowed: [
                    'Beragam, sering mengizinkan komersial dengan syarat',
                ],
                conditions: [
                    'Patuhi ketentuan lisensi Meta (dan AUP)',
                    'Atribusi mungkin diperlukan',
                ],
                warnings: [
                    'Lisensi khusus vendor; batasan tertentu dapat berlaku',
                ],
                recommendations: [
                    'Rujuk halaman resmi Meta untuk detail terbaru',
                ],
                link: null,
            };
        case 'gemma':
            return {
                name: 'Gemma (custom)',
                allowed: [
                    'Biasanya memperbolehkan penggunaan riset dan komersial',
                ],
                conditions: [
                    'Patuhi lisensi dan Acceptable Use Policy Google',
                ],
                warnings: [
                    'Ketentuan dapat berubah; pastikan memeriksa versi terbaru',
                ],
                recommendations: [
                    'Sertakan atribusi yang sesuai; baca dokumen resmi',
                ],
                link: null,
            };
        default:
            return fallback;
    }
}

function buildAttributionSnippet(model) {
    if (!model) return '';
    const id = model.modelId || model.id || '';
    const license = pickLicenseFromTags(model.tags) || '-';
    const licSlug = normalizeLicenseName(license);
    const licInfo = licenseDetails(licSlug);
    const link = id ? `https://huggingface.co/${id}` : '';
    const lines = [
        'Atribusi Model AI',
        `Model: ${id}`,
        `Lisensi: ${licInfo.name}${license && licInfo.name.toLowerCase() !== license.toLowerCase() ? ` (${license})` : ''}`,
        `Sumber: ${link}`,
        'Catatan: Gunakan sesuai ketentuan lisensi. Sertakan file LICENSE/NOTICE dan atribusi pada produk/README.'
    ];
    return lines.join('\n');
}

function buildModelInfoHtml(model) {
    if (!model) {
        return '<div class="card model-info-card bg-dark text-light border-0"><div class="card-body"><h5 class="card-title mb-2">Informasi Model</h5><p class="card-text text-secondary mb-0">Pilih model di sebelah kiri untuk melihat detailnya.</p></div></div>';
    }
    const id = model.modelId || model.id || '';
    const label = id.includes('/') ? id.split('/')[1] : id;
    const namespace = id.includes('/') ? id.split('/')[0] : '-';
    const sizeB = extractModelSizeB(id);
    const pipeline = friendlyPipelineTag(model.pipeline_tag);
    const library = friendlyLibrary(model.library_name);
    const likes = typeof model.likes === 'number' ? numberFmt(model.likes) : '-';
    const downloads = typeof model.downloads === 'number' ? numberFmt(model.downloads) : '-';
    const isPrivate = !!model.private;
    const createdAt = model.createdAt ? new Date(model.createdAt).toLocaleString('id-ID') : '-';
    const license = pickLicenseFromTags(model.tags);
    const licSlug = normalizeLicenseName(license);
    const licInfo = licenseDetails(licSlug);
    const baseModel = pickBaseModelFromTags(model.tags);
    const tags = Array.isArray(model.tags) ? model.tags.slice(0, 10) : [];

    const sizeText = sizeB ? `${sizeB}B` : 'Tidak tercantum';
    const privBadge = isPrivate ? '<span class="badge bg-warning text-dark">Private</span>' : '<span class="badge bg-success">Public</span>';
    const link = id ? `https://huggingface.co/${id}` : '#';

    const tagsHtml = tags.map(t => `<span class="badge rounded-pill bg-secondary me-1 mb-1">${t}</span>`).join('');

    const licCollapseId = `license-details-${slugifyId(id || license || 'model')}`;

    return `
    <div class="card model-info-card bg-dark text-light border-0">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <div>
            <h5 class="card-title mb-1">${label}</h5>
            <div class="text-secondary small">Dari publisher: <strong>${namespace}</strong></div>
          </div>
          <a href="${link}" target="_blank" class="btn btn-outline-info btn-sm">Lihat di Hugging Face</a>
        </div>

        <div class="row g-2 mb-3">
          <div class="col-6">
            <div class="p-2 border rounded small bg-dark">Ukuran model: <strong>${sizeText}</strong></div>
          </div>
          <div class="col-6">
            <div class="p-2 border rounded small bg-dark">Lisensi: <strong>${license || '-'}</strong></div>
          </div>
          <div class="col-6">
            <div class="p-2 border rounded small bg-dark">Pipeline: <strong>${pipeline}</strong></div>
          </div>
          <div class="col-6">
            <div class="p-2 border rounded small bg-dark">Library: <strong>${library}</strong></div>
          </div>
        </div>

        <div class="d-flex align-items-center gap-2 mb-3">
          <span class="badge bg-primary">Likes: ${likes}</span>
          <span class="badge bg-info text-dark">Downloads: ${downloads}</span>
          ${privBadge}
        </div>

        ${baseModel ? `<div class="mb-2 small">Diturunkan dari: <strong>${baseModel}</strong></div>` : ''}
        <div class="mb-2 small">Dibuat pada: ${createdAt}</div>

        ${tagsHtml ? `<div class="mt-2"><div class="small mb-1">Tag & kemampuan:</div>${tagsHtml}</div>` : ''}

        <div class="mt-3">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <div class="fw-semibold">Lisensi & Penggunaan</div>
            <button class="btn btn-sm btn-outline-warning" type="button" data-bs-toggle="collapse" data-bs-target="#${licCollapseId}" aria-expanded="false" aria-controls="${licCollapseId}">Pelajari ketentuan</button>
          </div>
          <div class="collapse" id="${licCollapseId}">
            <div class="p-2 border rounded bg-dark text-light">
              <div class="small mb-1">Tipe lisensi: <strong>${licInfo.name}</strong></div>
              <div class="row g-2 small">
                <div class="col-md-6">
                  <div class="mb-1 fw-semibold">Boleh</div>
                  <ul class="list-compact mb-2">${(licInfo.allowed||[]).map(x => `<li>${x}</li>`).join('')}</ul>
                </div>
                <div class="col-md-6">
                  <div class="mb-1 fw-semibold">Syarat</div>
                  <ul class="list-compact mb-2">${(licInfo.conditions||[]).map(x => `<li>${x}</li>`).join('')}</ul>
                </div>
                <div class="col-md-6">
                  <div class="mb-1 fw-semibold">Peringatan</div>
                  <ul class="list-compact mb-2">${(licInfo.warnings||[]).map(x => `<li>${x}</li>`).join('')}</ul>
                </div>
                <div class="col-md-6">
                  <div class="mb-1 fw-semibold">Rekomendasi</div>
                  <ul class="list-compact mb-2">${(licInfo.recommendations||[]).map(x => `<li>${x}</li>`).join('')}</ul>
                </div>
              </div>
              <div class="small text-secondary">Ini bukan nasihat hukum. Selalu periksa teks lisensi asli sebelum produksi.${licInfo.link ? ` <a href='${licInfo.link}' target='_blank' class='link-info'>Lihat detail lisensi</a>.` : ''}</div>
              <div class="mt-2 d-flex gap-2">
                <button type="button" id="btnCopyAttribution" class="btn btn-sm btn-outline-info">Copy Atribusi</button>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-3">
          <div class="fw-semibold mb-1">Checklist Kepatuhan</div>
          <div class="form-check small">
            <input class="form-check-input" type="checkbox" value="1" id="chkLicenseAck">
            <label class="form-check-label" for="chkLicenseAck">
              Saya memahami ketentuan lisensi dan akan mematuhinya.
            </label>
          </div>
          <div class="form-check small">
            <input class="form-check-input" type="checkbox" value="1" id="chkAttributionConfirm">
            <label class="form-check-label" for="chkAttributionConfirm">Saya akan menyertakan atribusi dan file LICENSE/NOTICE.</label>
          </div>
          <div class="mt-2">
            <button type="button" id="btnContinueSetup" class="btn btn-primary" disabled>Lanjutkan Setup</button>
          </div>
        </div>

        <div class="mt-3 small text-secondary">
          Catatan: Angka ukuran (mis. 3B, 7B, 8B) adalah indikasi kompleksitas model. Semakin besar, semakin butuh sumber daya (GPU/CPU/RAM) untuk berjalan dan dilatih.
        </div>
      </div>
    </div>`;
}

function renderModelInfoById(modelId) {
    const container = document.getElementById('modelInfoContainer');
    if (!container) return;
    const model = window.__hfModelCache ? window.__hfModelCache[modelId] : null;
    container.innerHTML = buildModelInfoHtml(model);
}

function updateContinueButtonState() {
    const hasModel = !!$('#modelSelect').val();
    const ack1 = $('#chkLicenseAck').is(':checked');
    const ack2 = $('#chkAttributionConfirm').is(':checked');
    const $btn = $('#btnContinueSetup');
    if ($btn.length) {
        $btn.prop('disabled', !(hasModel && ack1 && ack2));
    }
}

let __modelSearchSeq = 0;
// Perform search and populate the select with results
async function searchHuggingFaceModels(query) {
    // Allow calling without args; read from input if needed
    if (typeof query === 'undefined') {
        const el = document.getElementById('modelSearchInput');
        query = el ? el.value : '';
    }
    let controller; let timeoutId;
    try {
        if (!query || query.trim().length <= 5) {
            populateModelSelect([]);
            return;
        }

        const seq = ++__modelSearchSeq;
        const baseUrl = 'https://huggingface.co/api/models';
        const params = new URLSearchParams({
            search: query.trim(),
            pipeline_tag: 'text-generation',
            sort: 'downloads',
            limit: '50'
        });
        const url = `${baseUrl}?${params.toString()}`;

        controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort('timeout'), 12000);
        const response = await fetch(url, {
            headers: { 'Accept': 'application/json' },
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache',
            signal: controller.signal,
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const models = await response.json();
        upsertModelCache(models);
        const { list: ftModels, dropped } = filterFineTunableModels(models || []);
        if (Array.isArray(models) && models.length > 0) {
            const kept = ftModels.length;
            const total = models.length;
            if (kept === 0) {
                updateModelFilterNote('Tidak ada hasil yang cocok untuk fine-tuning. Coba kata kunci lain.');
            } else if (dropped > 0) {
                updateModelFilterNote(`Menampilkan ${kept} model cocok fine-tuning (disembunyikan ${dropped} non-cocok).`);
            } else {
                updateModelFilterNote('Semua hasil cocok untuk fine-tuning.');
            }
        } else {
            updateModelFilterNote('Hanya menampilkan model yang cocok untuk fine-tuning (bukan GGUF/LoRA/adapter/quantized).');
        }
        const modelOptions = (ftModels || []).map(model => {
            const rawId = model && (model.modelId || model.id || model.name || '');
            const id = String(rawId);
            const label = id.includes('/') ? id.split('/')[1] : id;
            return { id, label };
        });

        if (seq === __modelSearchSeq) {
            populateModelSelect(modelOptions);
        }
    } catch (error) {
        console.error('Gagal melakukan pencarian:', error);
        populateModelSelect([]);
        updateModelFilterNote('Gagal memuat hasil. Periksa koneksi atau coba lagi.');
    }
    finally {
        // Clear timeout if still pending
        if (timeoutId) { try { clearTimeout(timeoutId); } catch (_) { }
        }
    }
}

// Wire up events for search and validation when DOM is ready
$(document).ready(function () {
    const $search = $('#modelSearchInput');
    const $select = $('#modelSelect');
    const $btnClear = $('#btnClearSearch');

    if ($search.length && $select.length) {
        $search.on('input', debounce(async function () {
            const q = $(this).val();
            setSearchLoading(true);
            await searchHuggingFaceModels(q);
            setSearchLoading(false);
            // Ensure re-enabled if results exist
            if ($('#modelSelect option').length > 1) {
                $('#modelSelect').prop('disabled', false).removeAttr('disabled');
            }
        }, 400));

        $btnClear.on('click', function () {
            $search.val('');
            populateModelSelect([]);
            setSearchLoading(false);
            $('#modelSizeAlert').addClass('d-none');
            $select.prop('disabled', true).html('<option value="">Ketik di kotak pencarian untuk mulai...</option>');
            renderModelInfoById(null);
            updateModelFilterNote('Hanya menampilkan model yang cocok untuk fine-tuning (bukan GGUF/LoRA/adapter/quantized).');
        });

        $select.on('change', function () {
            validateSelectedModelSize();
            const id = $(this).val();
            if (id) {
                renderModelInfoById(id);
            } else {
                renderModelInfoById(null);
            }
            updateContinueButtonState();
        });
    }
    // Delegated handlers for dynamic elements in model info card
    $(document).on('click', '#btnCopyAttribution', async function () {
        const id = $('#modelSelect').val();
        if (!id) return;
        const model = window.__hfModelCache ? window.__hfModelCache[id] : null;
        const text = buildAttributionSnippet(model);
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                const ta = document.createElement('textarea');
                ta.value = text; document.body.appendChild(ta); ta.select();
                document.execCommand('copy'); document.body.removeChild(ta);
            }
            const $btn = $(this);
            const prev = $btn.text();
            $btn.text('Disalin ✔');
            setTimeout(() => $btn.text(prev), 1500);
            showToast('Atribusi disalin ke clipboard', 'success');
        } catch (e) {
            showToast('Gagal menyalin, salin manual ya', 'warning');
        }
    });

    $(document).on('change', '#chkLicenseAck, #chkAttributionConfirm', function () {
        updateContinueButtonState();
    });

    $(document).on('click', '#btnContinueSetup', function () {
        const id = $('#modelSelect').val();
        const model = window.__hfModelCache ? window.__hfModelCache[id] : null;
        if (!id || !model) return;
        // build state
        const license = pickLicenseFromTags(model.tags) || '-';
        const state = {
            id,
            label: (id && id.includes('/')) ? id.split('/')[1] : id,
            license,
            ackLicense: $('#chkLicenseAck').is(':checked'),
            ackAttribution: $('#chkAttributionConfirm').is(':checked'),
            savedAt: new Date().toISOString()
        };
        try {
            localStorage.setItem('ftx.selectedModel', JSON.stringify(state));
        } catch (e) { console.warn('localStorage failed:', e); }
        showToast('Disimpan. Membuka konfigurasi dataset...', 'success');
        setTimeout(() => {
            const target = `/Home/Privacy?modelId=${encodeURIComponent(id)}`;
            window.location.href = target;
        }, 600);
    });

    // Privacy page: render selection summary and hooks
    try { renderModelSelectionSummaryOnPrivacy(); } catch (_) {}

    $(document).on('click', '#btnCopyAttributionSummary', async function () {
        const state = getSavedSelectionState();
        if (!state || !state.id) return;
        const text = buildAttributionSnippetFromState(state);
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                const ta = document.createElement('textarea');
                ta.value = text; document.body.appendChild(ta); ta.select();
                document.execCommand('copy'); document.body.removeChild(ta);
            }
            showToast('Atribusi disalin ke clipboard', 'success');
        } catch (e) {
            showToast('Gagal menyalin, salin manual ya', 'warning');
        }
    });

    $(document).on('click', '#btnSaveDatasetCfg', function () {
        const name = ($('#datasetName').val() || '').toString().trim();
        let split = parseInt($('#trainSplit').val(), 10);
        if (isNaN(split)) split = 90;
        split = Math.max(50, Math.min(95, split));
        try {
            localStorage.setItem('ftx.datasetCfg', JSON.stringify({ name, trainSplit: split, savedAt: new Date().toISOString() }));
            $('#trainSplit').val(split);
            $('#datasetCfgSaved').removeClass('d-none');
            setTimeout(() => $('#datasetCfgSaved').addClass('d-none'), 1500);
            showToast('Konfigurasi dataset tersimpan', 'success');
        } catch (_) {
            showToast('Gagal menyimpan konfigurasi', 'warning');
        }
    });
});
