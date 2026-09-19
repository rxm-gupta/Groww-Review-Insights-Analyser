// Global State
let parsedData = [];

// Canonical Theme Dictionary: Descriptions & Action Ideas mapped by THEME NAME
const THEME_KNOWLEDGE_BASE = {
    "Market-Open Latency & Stability": {
        desc: "Frequent app crashes, frozen charts, and network timeouts during the 09:15–09:45 AM opening rush, causing missed exits.",
        action: {
            title: "Market-Open Read-Only Failover Cache",
            pod: "Infra Pod",
            detail: "Decouple watchlist and portfolio viewing from the order execution engine to survive 09:15–09:45 AM opening load spikes."
        }
    },
    "Withdrawal Latency & Settlement": {
        desc: "Wallet is debited instantly but bank credits stall 3–5 days with repetitive scripted bot responses.",
        action: {
            title: "Visual Fund Settlement Tracker with UTR",
            pod: "Payments Pod",
            detail: "Expose real-time clearing milestones (Initiated → Clearing House → Bank UTR → Credit) in-app to eliminate support tickets."
        }
    },
    "Pricing, MTF & Hidden Fees": {
        desc: "Unexpected brokerage deductions, daily MTF margin interest, and auto square-off penalties wiping out small profits.",
        action: {
            title: "Pre-Trade MTF & Fee Modal",
            pod: "Growth & Pricing",
            detail: "Embed an upfront breakdown of daily margin interest and square-off charges on the order slip before swipe-to-trade."
        }
    },
    "KYC & Account Setup": {
        desc: "Bank proof verification rejections, document upload errors, and multi-day account activation delays.",
        action: {
            title: "Real-time OCR & Penny-Drop Verifier",
            pod: "Onboarding Pod",
            detail: "Implement client-side bank statement readability check and instant automated penny-drop retries to unblock activation."
        }
    },
    "Charting & Execution Tools": {
        desc: "TradingView chart sync delays, indicator reset glitches, and missing bracket/SL-M order options during active trades.",
        action: {
            title: "Client-Side Chart Engine & Indicator Cache",
            pod: "Trading Tech",
            detail: "Localize indicator calculation on-device to eliminate charting lag and persist custom technical indicators."
        }
    },
    "Other / Support": {
        desc: "Support ticket delays, unhelpful automated bot responses, and slow query resolution times.",
        action: {
            title: "Priority Support Auto-Escalation Bot",
            pod: "Customer Ops",
            detail: "Route financial and transactional blockers directly to human support tiers within 10 minutes."
        }
    }
};

const PRIORITY_BADGES = [
    { priority: "P0 CRITICAL", badgeStyle: "bg-rose-950/50 text-rose-300 border border-rose-800/40", actionTag: "bg-rose-500/10 text-rose-400 border border-rose-500/20" },
    { priority: "P1 HIGH", badgeStyle: "bg-amber-950/50 text-amber-300 border border-amber-800/40", actionTag: "bg-amber-500/10 text-amber-400 border border-amber-500/20" },
    { priority: "P2 MEDIUM", badgeStyle: "bg-sky-950/50 text-sky-300 border border-sky-800/40", actionTag: "bg-sky-500/10 text-sky-400 border border-sky-500/20" }
];

// Tab Navigation
function switchTab(tabId) {
    document.getElementById('tab-dashboard').classList.add('hide');
    document.getElementById('tab-legend').classList.add('hide');
    document.getElementById(`tab-${tabId}`).classList.remove('hide');
    
    document.getElementById('tab-btn-dashboard').className = "px-4 py-1.5 rounded-md text-sm font-medium text-slate-400 hover:text-white transition-all";
    document.getElementById('tab-btn-legend').className = "px-4 py-1.5 rounded-md text-sm font-medium text-slate-400 hover:text-white transition-all";
    
    document.getElementById(`tab-${tabId}`).className = "px-4 py-1.5 rounded-md text-sm font-medium bg-[#16272C] text-white transition-all shadow-sm";
}

// PII Scrubbing
function scrubPII(text) {
    if (!text) return "";
    let safe = text.replace(/[\w\.-]+@[\w\.-]+\.\w+/g, '[REDACTED_EMAIL]');
    safe = safe.replace(/\b(?:\+91|0)?[6-9]\d{9}\b/g, '[REDACTED_PHONE]');
    safe = safe.replace(/\b[A-Z]{5}[0-9]{4}[A-Z]\b/g, '[REDACTED_PAN]');
    safe = safe.replace(/\b\d{12}\b/g, '[REDACTED_AADHAAR]');
    return safe;
}

// Theme Classification
function classifyTheme(text) {
    const lower = text.toLowerCase();
    if (/(crash|lag|stuck|open|freeze|internet|error|server|slow|unusable|log in|login)/.test(lower)) return "Market-Open Latency & Stability";
    if (/(withdraw|bank|credit|transfer|pending|delay|deducted|refund)/.test(lower)) return "Withdrawal Latency & Settlement";
    if (/(brokerage|charges|hidden|fee|mtf|deduction|gst|loot)/.test(lower)) return "Pricing, MTF & Hidden Fees";
    if (/(kyc|verification|aadhaar|pan|document|activation|rejected|onboarding)/.test(lower)) return "KYC & Account Setup";
    if (/(chart|candle|indicator|order|sl|stoploss|target|ui|interface|dark mode|basket)/.test(lower)) return "Charting & Execution Tools";
    return "Other / Support";
}

function truncateWords(text, maxWords = 18) {
    if (!text) return "";
    const words = text.trim().split(/\s+/);
    if (words.length <= maxWords) return text;
    return words.slice(0, maxWords).join(' ') + '...';
}

function getCsvDateRange(data) {
    const dates = data
        .map(r => new Date(r.date))
        .filter(d => !isNaN(d))
        .sort((a, b) => a - b);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    if (!dates.length) {
        const today = new Date();
        const lastWeek = new Date();
        lastWeek.setDate(today.getDate() - 7);
        return `(${monthNames[lastWeek.getMonth()]} ${lastWeek.getDate()} – ${monthNames[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()})`;
    }

    const latest = dates[dates.length - 1];
    const earliestInWeek = new Date(latest);
    earliestInWeek.setDate(latest.getDate() - 7);

    return `(${monthNames[earliestInWeek.getMonth()]} ${earliestInWeek.getDate()} – ${monthNames[latest.getMonth()]} ${latest.getDate()}, ${latest.getFullYear()})`;
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => parseAndLoad(e.target.result);
    reader.readAsText(file);
}

function loadSampleData() {
    parseAndLoad(SAMPLE_CSV_DATA);
}

function parseAndLoad(csvString) {
    Papa.parse(csvString, {
        header: true,
        skipEmptyLines: true,
        complete: function(results) {
            parsedData = results.data.map(rawRow => {
                const row = {};
                for (const k in rawRow) {
                    if (rawRow.hasOwnProperty(k)) {
                        row[k.trim().toLowerCase()] = rawRow[k];
                    }
                }

                const titleText = row.title || row.subject || row.headline || "";
                const bodyText = row.text || row.review || row.content || row.body || row.comment || "";
                const fullText = (titleText + " " + bodyText).trim();
                const scrubbed = scrubPII(fullText);

                const rawRating = row.rating || row.score || row.stars || row['star rating'] || "0";
                const ratingNum = parseInt(rawRating, 10) || 0;

                const platform = row.platform || row.app || row.store || row.source || "Google Play";
                const date = row.date || row['review date'] || row['created at'] || row.timestamp || "-";

                return {
                    date: date,
                    platform: platform,
                    rating: ratingNum,
                    originalText: scrubbed,
                    theme: row.theme || classifyTheme(scrubbed)
                };
            });
            showPreview();
        }
    });
}

function showPreview() {
    document.getElementById('step-import').classList.add('hide');
    document.getElementById('step-preview').classList.remove('hide');
    
    const tbody = document.getElementById('preview-tbody');
    const footerNote = document.getElementById('preview-footer-note');
    
    const MAX_PREVIEW_ROWS = 50;
    const previewSubset = parsedData.slice(0, MAX_PREVIEW_ROWS);
    
    let totalRating = 0;
    parsedData.forEach(row => totalRating += row.rating);

    tbody.innerHTML = previewSubset.map(row => {
        const ratingHtml = `<span class="text-amber-400 font-medium">${row.rating} ★</span>`;
        const icon = row.platform.toLowerCase().includes('apple') || row.platform.toLowerCase().includes('ios') || row.platform.toLowerCase().includes('app store') 
            ? '<i class="fa-brands fa-apple text-slate-300"></i>' 
            : '<i class="fa-brands fa-google-play text-emerald-400"></i>';

        return `
            <tr class="hover:bg-slate-800/40 transition-colors">
                <td class="px-4 py-3 text-slate-400 whitespace-nowrap text-xs">${row.date}</td>
                <td class="px-4 py-3 text-slate-300 whitespace-nowrap flex items-center gap-2 text-xs">${icon} ${row.platform}</td>
                <td class="px-4 py-3 whitespace-nowrap text-xs">${ratingHtml}</td>
                <td class="px-4 py-3"><span class="px-2 py-0.5 bg-[#14252A] rounded text-[11px] text-slate-300 border border-[#1E353C] whitespace-nowrap font-medium">${row.theme}</span></td>
                <td class="px-4 py-3 text-slate-300 truncate max-w-md text-xs" title="${row.originalText.replace(/"/g, '&quot;')}">${row.originalText}</td>
            </tr>
        `;
    }).join('');
    
    const avg = (totalRating / (parsedData.length || 1)).toFixed(1);
    document.getElementById('preview-stats').innerText = `${parsedData.length} reviews processed · Avg Rating: ${avg} ★ · PII Scrubbed`;

    footerNote.innerText = parsedData.length > MAX_PREVIEW_ROWS 
        ? `Displaying first ${MAX_PREVIEW_ROWS} of ${parsedData.length} rows. All rows are analyzed in the pulse note.`
        : `All ${parsedData.length} rows loaded.`;
}

function generateNote() {
    document.getElementById('step-preview').classList.add('hide');
    document.getElementById('step-report').classList.remove('hide');
    
    const dynamicRange = getCsvDateRange(parsedData);
    document.getElementById('date-range-display').innerText = dynamicRange;

    // 1. Calculate Top Themes from Negative Feedback (<= 3 Stars)
    const themeCounts = {};
    let totalNeg = 0;
    parsedData.forEach(r => {
        if (r.rating <= 3) {
            themeCounts[r.theme] = (themeCounts[r.theme] || 0) + 1;
            totalNeg++;
        }
    });

    // If no negative reviews exist, pull from all reviews
    if (totalNeg === 0 && parsedData.length > 0) {
        parsedData.forEach(r => {
            themeCounts[r.theme] = (themeCounts[r.theme] || 0) + 1;
            totalNeg++;
        });
    }
    
    const sortedThemes = Object.entries(themeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

    const gridContainer = document.getElementById('themes-grid-container');
    const actionsContainer = document.getElementById('actions-container');
    gridContainer.innerHTML = '';
    actionsContainer.innerHTML = '';
    
    let rawNoteText = `TOP USER FRICTION THEMES:\n`;
    let rawActionsText = `\nACTION IDEAS:\n`;

    sortedThemes.forEach(([themeName, count], index) => {
        const percentage = Math.round((count / (totalNeg || 1)) * 100);
        const badge = PRIORITY_BADGES[index] || { priority: "P2 LOW", badgeStyle: "bg-slate-800 text-slate-300 border border-slate-700", actionTag: "bg-slate-800 text-slate-300 border border-slate-700" };
        
        // Lookup knowledge base by THEME NAME (prevents description mismatches)
        const themeInfo = THEME_KNOWLEDGE_BASE[themeName] || {
            desc: "Customer friction reported in app store feedback.",
            action: { title: `${themeName} Review & Patch`, pod: "Core Product Pod", detail: "Audit customer friction points and address frequent UX blockers." }
        };

        // Render Theme Card
        gridContainer.innerHTML += `
            <div class="bg-[#0E1A1E] border border-[#182B31] rounded-2xl p-5 hover:border-slate-600 transition-all flex flex-col justify-between shadow-lg">
                <div>
                    <div class="flex items-center justify-between mb-3">
                        <span class="text-xs font-bold px-2.5 py-0.5 rounded-full ${badge.badgeStyle}">${percentage}% Volume</span>
                        <span class="text-[11px] font-bold text-slate-400 tracking-wider uppercase">${badge.priority}</span>
                    </div>
                    <h4 class="text-base font-bold text-white mb-2 tracking-tight">${index + 1}. ${themeName}</h4>
                    <p class="text-xs text-slate-300 leading-relaxed font-normal">${themeInfo.desc}</p>
                </div>
            </div>
        `;
        rawNoteText += `${index+1}. ${themeName} (${percentage}% Volume, ${badge.priority})\n`;

        // Render Matching Dynamic Action Card
        actionsContainer.innerHTML += `
            <div class="flex flex-col sm:flex-row sm:items-center justify-between bg-[#0E1A1E] border border-[#182B31] p-4 rounded-xl hover:border-slate-600 transition-colors gap-4">
                <div class="flex items-start sm:items-center gap-3">
                    <span class="px-2.5 py-1 ${badge.actionTag} text-[10px] font-extrabold rounded tracking-wider whitespace-nowrap">${badge.priority}</span>
                    <div>
                        <h4 class="text-sm font-bold text-white">${themeInfo.action.title}</h4>
                        <p class="text-xs text-slate-400 mt-0.5">${themeInfo.action.detail}</p>
                    </div>
                </div>
                <span class="px-2.5 py-1 bg-[#14252A] text-slate-400 text-[11px] font-medium rounded self-start sm:self-auto border border-[#1E353C] whitespace-nowrap">${themeInfo.action.pod}</span>
            </div>
        `;
        rawActionsText += `${index+1}. [${badge.priority}] ${themeInfo.action.title} (${themeInfo.action.pod})\n`;
    });

    // 2. Extract Real Quotes (Prioritize 1-2 stars)
    let candidateQuotes = parsedData.filter(r => r.rating <= 2);
    if (candidateQuotes.length === 0) candidateQuotes = parsedData;
    
    const shuffled = [...candidateQuotes].sort(() => 0.5 - Math.random());
    const selectedQuotes = shuffled.slice(0, 3);

    // Update section header to dynamically reflect count
    const quotesHeader = document.getElementById('quotes-header-title');
    if (quotesHeader) {
        quotesHeader.innerHTML = `<i class="fa-solid fa-quote-left"></i> What Users Are Saying (${selectedQuotes.length} Real Quote${selectedQuotes.length === 1 ? '' : 's'})`;
    }

    const quotesContainer = document.getElementById('quotes-container');
    quotesContainer.innerHTML = '';
    rawNoteText += `\nWHAT USERS ARE SAYING:\n`;

    selectedQuotes.forEach(q => {
        const icon = q.platform.toLowerCase().includes('apple') || q.platform.toLowerCase().includes('ios') || q.platform.toLowerCase().includes('app store')
            ? '<i class="fa-brands fa-apple text-slate-300"></i>' 
            : '<i class="fa-brands fa-google-play text-emerald-400"></i>';
        
        const cleanQuote = truncateWords(q.originalText, 18);

        quotesContainer.innerHTML += `
            <div class="bg-[#0E1A1E] border border-[#182B31] p-4 rounded-xl">
                <div class="flex items-start gap-3">
                    <div class="bg-[#14252A] text-amber-400 border border-[#1E353C] text-[11px] font-bold px-2 py-0.5 rounded flex items-center gap-1 shrink-0 mt-0.5">
                        ★ ${q.rating}★
                    </div>
                    <div>
                        <p class="text-sm text-slate-200 italic mb-2 font-normal leading-relaxed">"${cleanQuote}"</p>
                        <div class="flex items-center gap-2 text-xs text-slate-500 font-medium">
                            <span class="flex items-center gap-1.5 text-groww font-semibold">${icon} ${q.platform}</span>
                            <span>•</span>
                            <span class="text-slate-400">${q.theme}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        rawNoteText += `• "${cleanQuote}" (${q.platform}, ${q.rating}★)\n`;
    });

    const fullEmailText = `Hi Team,\n\nHere is the latest Customer Voice & Product Health Summary:\n\n${rawNoteText}${rawActionsText}\nBest,\nCustomer Pulse Automation Team`;

    // Word Count Verification
    const words = fullEmailText.trim().split(/\s+/).length;
    const wordCountBadge = document.getElementById('word-count-badge');
    const wordCountText = document.getElementById('word-count-text');

    if (words <= 250) {
        wordCountBadge.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 text-xs font-semibold";
        wordCountText.innerText = `${words} words (≤250w Pass)`;
    } else {
        wordCountBadge.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-rose-950/60 text-rose-400 border border-rose-500/30 text-xs font-semibold";
        wordCountText.innerText = `${words} words (>250w Limit)`;
    }

    document.getElementById('email-subject').value = `[Product Pulse] Groww Customer Voice & Product Health Summary ${dynamicRange}`;
    document.getElementById('email-body').value = fullEmailText;
}

// -----------------------------------------------------
// DOWNLOAD / EXPORT LOGIC (PDF & DOC)
// -----------------------------------------------------

function toggleDownloadMenu(event) {
    event.stopPropagation();
    const menu = document.getElementById('download-dropdown-menu');
    menu.classList.toggle('hidden');
}

function closeDownloadMenu() {
    const menu = document.getElementById('download-dropdown-menu');
    if (menu) menu.classList.add('hidden');
}

document.addEventListener('click', () => {
    closeDownloadMenu();
});

function downloadPDF() {
    closeDownloadMenu();
    const element = document.getElementById('report-card');
    const dateRange = document.getElementById('date-range-display').innerText;
    const btn = document.getElementById('download-dropdown-btn');
    const originalHTML = btn.innerHTML;

    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin text-groww"></i> Preparing PDF...`;
    btn.disabled = true;

    const opt = {
        margin:       [8, 8, 8, 8],
        filename:     `Groww_Pulse_Summary_${dateRange.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#071013' },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
    }).catch(err => {
        console.error("html2pdf fallback to print", err);
        window.print();
        btn.innerHTML = originalHTML;
        btn.disabled = false;
    });
}

function downloadDoc() {
    closeDownloadMenu();
    const dateRange = document.getElementById('date-range-display').innerText;
    
    const themeCards = document.querySelectorAll('#themes-grid-container > div');
    let themesHtml = '';
    themeCards.forEach(card => {
        const vol = card.querySelector('span:first-child')?.innerText || '';
        const prio = card.querySelector('span:last-child')?.innerText || '';
        const title = card.querySelector('h4')?.innerText || '';
        const desc = card.querySelector('p')?.innerText || '';
        themesHtml += `
            <div style="margin-bottom: 12px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 6px; background-color: #f8fafc;">
                <p style="margin: 0 0 4px 0; font-size: 11pt;"><strong>${title}</strong> &nbsp; <span style="color: #64748b; font-size: 9pt;">[${vol} - ${prio}]</span></p>
                <p style="margin: 0; color: #334155; font-size: 10pt;">${desc}</p>
            </div>
        `;
    });

    const quoteCards = document.querySelectorAll('#quotes-container > div');
    let quotesHtml = '';
    quoteCards.forEach(card => {
        const rating = card.querySelector('[class*="amber"]')?.innerText || '';
        const quoteText = card.querySelector('p')?.innerText || '';
        const platformTheme = card.querySelector('div.flex.items-center.gap-2')?.innerText || '';
        quotesHtml += `
            <blockquote style="margin: 8px 0; padding: 10px 14px; border-left: 4px solid #00D09C; background-color: #f1f5f9;">
                <p style="margin: 0 0 4px 0; font-style: italic; color: #1e293b;">${quoteText}</p>
                <small style="color: #64748b; font-size: 9pt;">${rating} | ${platformTheme}</small>
            </blockquote>
        `;
    });

    const actionCards = document.querySelectorAll('#actions-container > div');
    let actionsHtml = '';
    actionCards.forEach(card => {
        const prio = card.querySelector('span:first-child')?.innerText || '';
        const title = card.querySelector('h4')?.innerText || '';
        const detail = card.querySelector('p')?.innerText || '';
        const pod = card.querySelector('span:last-child')?.innerText || '';
        actionsHtml += `<li><strong>[${prio}] ${title}</strong> (${pod})<br><span style="color:#475569;">${detail}</span></li>`;
    });

    const docContent = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>Groww Weekly Customer Pulse</title>
        <style>
            body { font-family: Calibri, Arial, sans-serif; line-height: 1.5; color: #0f172a; padding: 20px; }
            h1 { color: #071013; font-size: 18pt; margin-bottom: 4pt; }
            h2 { color: #00B386; font-size: 13pt; border-bottom: 1px solid #cbd5e1; padding-bottom: 4pt; margin-top: 18pt; }
            .header-meta { color: #00B386; font-size: 10pt; font-weight: bold; margin-bottom: 6pt; }
            ul { margin-top: 6pt; padding-left: 20pt; }
            li { margin-bottom: 6pt; font-size: 10pt; color: #1e293b; }
        </style>
        </head>
        <body>
            <div class="header-meta">GROWW WEEKLY CUSTOMER PULSE &bull; ${dateRange}</div>
            <h1>Customer Voice & Product Health Summary</h1>
            <p style="color: #64748b; font-size: 10pt; margin-top: 0;">Weekly digest synthesized across Google Play Store & iOS App Store. All user identifiers strictly scrubbed.</p>
            
            <h2>Top User Friction Themes</h2>
            ${themesHtml}

            <h2>What Users Are Saying</h2>
            ${quotesHtml}

            <h2>Action Ideas</h2>
            <ul>
                ${actionsHtml}
            </ul>
        </body>
        </html>
    `;

    const blob = new Blob(['\ufeff' + docContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Groww_Pulse_Summary_${dateRange.replace(/[^a-zA-Z0-9]/g, '_')}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function draftEmail() {
    const to = encodeURIComponent(document.getElementById('email-to').value.trim());
    const subject = encodeURIComponent(document.getElementById('email-subject').value);
    const body = encodeURIComponent(document.getElementById('email-body').value);

    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}&body=${body}`, '_blank');
}

function copyEmail() {
    const bodyText = document.getElementById('email-body').value;
    const btn = document.getElementById('copy-btn');
    const originalHTML = btn.innerHTML;

    navigator.clipboard.writeText(bodyText).then(() => {
        btn.innerHTML = `<i class="fa-solid fa-check"></i> Copied!`;
        btn.classList.remove('bg-groww', 'hover:bg-groww-dark');
        btn.classList.add('bg-emerald-500', 'text-slate-950');

        setTimeout(() => {
            btn.innerHTML = originalHTML;
            btn.classList.remove('bg-emerald-500', 'text-slate-950');
            btn.classList.add('bg-groww', 'hover:bg-groww-dark');
        }, 2000);
    }).catch(err => {
        const textArea = document.getElementById('email-body');
        textArea.select();
        document.execCommand('copy');
        btn.innerHTML = `<i class="fa-solid fa-check"></i> Copied!`;
        setTimeout(() => {
            btn.innerHTML = originalHTML;
        }, 2000);
    });
}

function resetApp() {
    parsedData = [];
    document.getElementById('csv-upload').value = '';
    document.getElementById('step-report').classList.add('hide');
    document.getElementById('step-preview').classList.add('hide');
    document.getElementById('step-import').classList.remove('hide');
}

const SAMPLE_CSV_DATA = `platform,rating,title,text,date
Play Store,2,KYC stuck for weeks,"My bank account verification has been pending for 12 days now. Uploaded documents twice, no update from support.",2026-07-06
App Store,1,Withdrawal not credited,"Requested a withdrawal from my wallet and it has been 6 working days. Still shows processing. This is my money.",2026-07-08
Play Store,5,Great for beginners,"Super clean interface, I started my first SIP in under 5 minutes. Love how simple everything is.",2026-07-09
App Store,3,App keeps crashing,"App crashes almost every time I open the F&O section. Have to restart my phone to get it working again.",2026-07-10
Play Store,1,Support never replies,"Raised a ticket about a failed UPI payment 4 days ago. No response on chat or email. Very frustrating.",2026-07-12
Play Store,4,Good but needs stop-loss,"Overall a great app for mutual funds and stocks. Would love a proper stop-loss and GTT feature for intraday.",2026-07-14
App Store,2,Login issues during market open,"Couldn't log in right when markets opened, missed my buy order. This keeps happening during volatile days.",2026-07-15
Play Store,5,Smooth SIP experience,"Setting up and tracking my SIPs is effortless. The dashboard is very intuitive for a first time investor.",2026-07-16
App Store,1,Bank verification rejected twice,"My bank proof got rejected twice for unclear reasons, and customer care could not explain why.",2026-07-19
Play Store,2,Slow withdrawal processing,"Withdrawal to my bank account took 5 days instead of the promised 1-2 days. No proactive update was sent.",2026-07-21
Play Store,4,"Nice charts, laggy at times","Charting is decent for a beginner app, but scrolling through watchlists lags on my phone sometimes.",2026-07-22
App Store,1,App froze during a trade,"App froze mid order placement and I could not tell if my order went through. Had to check web version separately.",2026-07-24
Play Store,3,Onboarding could be faster,"KYC process asked for the same documents three times across different screens. Confusing and repetitive.",2026-07-26
App Store,5,Best app for new investors,"As someone new to investing, this app made it very easy to understand mutual funds and start small.",2026-07-27
Play Store,1,"Money deducted, order failed","Amount was deducted for a mutual fund purchase but the order shows failed. Refund still not received after a week.",2026-07-29
Play Store,2,Customer support very slow,"In app chat support takes hours to respond and mostly gives generic replies that don't solve the issue.",2026-08-01
App Store,4,Request: dark mode watchlist,"Would love more customization on the watchlist and a proper dark mode across all screens.",2026-08-02
Play Store,1,Withdrawal delayed again,"Second time this month my withdrawal has taken more than 4 working days. Support just says 'please wait'.",2026-08-04
App Store,5,Clean and reliable,"Been using this for a year now for SIPs, works well most of the time and the UI is clean.",2026-08-05
Play Store,3,KYC document upload fails,"Document upload for KYC fails repeatedly on mobile data, only works on wifi. Needs fixing.",2026-08-07
App Store,2,App crashed on results day,"App crashed right after a big earnings announcement, right when I wanted to place an order. Bad timing.",2026-08-09
Play Store,5,Easy fund transfers,"Adding money and investing is very smooth. Best app for someone who wants to start investing without confusion.",2026-08-10
App Store,1,No update on my refund,"A failed transaction refund has not come back after 6 days. Support keeps saying it is 'in process'.",2026-08-12
Play Store,2,Support ignored my ticket,"Opened three support tickets for the same withdrawal delay issue and got no resolution, just copy paste replies.",2026-08-13
Play Store,4,"Solid app, minor bugs","Mostly reliable, but sometimes the portfolio value doesn't refresh properly until I restart the app.",2026-08-15
App Store,1,KYC rejected without reason,"My KYC got rejected with no clear reason given. Had to redo the whole process from scratch.",2026-08-17
Play Store,5,Great UI for beginners,"The whole app feels designed for people who are investing for the first time. Very approachable.",2026-08-18
App Store,2,Login broken again,"Could not log in for almost an hour today, right during market hours. Second time this happened this month.",2026-08-20
Play Store,3,Feature request: basket orders,"Please add basket order support like other apps, would make multi-stock investing much faster.",2026-08-21
App Store,1,Withdrawal stuck in processing,"My withdrawal has been stuck in processing status for 7 days now with no update from the team.",2026-08-23
Play Store,2,App lags on older phones,"App is quite heavy and lags a lot on my older phone, especially when switching between tabs.",2026-08-25
App Store,4,Helpful for SIP tracking,"Really like how it shows my SIP performance over time, makes it easy to stay on top of my investments.",2026-08-26
Play Store,1,Support unresponsive for days,"Sent multiple messages about a payment issue and got zero response for over 4 days straight.",2026-08-28
App Store,3,KYC verification slow,"Bank account linking for KYC took over a week. Everything else about the app is fine though.",2026-08-30
Play Store,5,Very beginner friendly,"I recommend this to all my friends who are new to the stock market, very easy to understand.",2026-09-01
App Store,2,Crashes during high traffic,"App becomes unusable when the market is very volatile, crashes or freezes right when I need it most.",2026-09-02
Play Store,1,Withdrawal delay with no explanation,"Withdrawal request pending for 6 days, no explanation given despite asking support twice.",2026-09-04
App Store,4,Good but chat support is weak,"App itself works fine, but if you ever need help the chat support takes forever to actually resolve anything.",2026-09-05
Play Store,3,Watchlist needs personalization,"Wish I could reorder and group my watchlist better, right now it feels a bit basic.",2026-09-07
App Store,1,Bank verification loop,"Stuck in a loop where KYC says pending, then failed, then pending again. No one can explain what's wrong.",2026-09-08
Play Store,5,Smooth experience overall,"Very happy with the app, investing in mutual funds has never been this easy for me.",2026-09-09
App Store,2,Support ticket closed without fix,"My support ticket about a stuck withdrawal was closed as 'resolved' without actually returning my money.",2026-09-10
Play Store,1,App unstable on order day,"App kept crashing on the day I wanted to place a large order, ended up missing the price I wanted.",2026-09-12
App Store,3,KYC process needs streamlining,"Too many steps for KYC that feel redundant, could easily be combined into fewer screens.",2026-09-13
Play Store,4,Nice for tracking portfolio,"Good overview of my portfolio and mutual funds in one place, though I wish loading was faster.",2026-09-14
App Store,1,Withdrawal still not received,"It has now been over a week since I requested a withdrawal, funds still not credited to my bank.",2026-09-15
Play Store,2,Support response time is bad,"Every time I raise an issue, it takes at least 2-3 days just to get a first reply from support.",2026-09-16
App Store,5,Very good for new investors,"Simple, clean, and great for someone starting their investing journey without getting overwhelmed.",2026-09-17
Play Store,1,App froze mid transaction,"App froze while I was completing a payment, couldn't tell if money was deducted or not, quite scary.",2026-09-17`;