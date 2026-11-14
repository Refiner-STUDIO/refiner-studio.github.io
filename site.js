(function(){
  'use strict';
  /* if the content file did not load, stop quietly: the fallback block stays visible, dead buttons are hidden */
  if(typeof CONTENT === 'undefined' || CONTENT === null || typeof CONTENT !== 'object'){
    ['reelBtn', 'moreWrap'].forEach(id => { const n = document.getElementById(id); if(n) n.hidden = true; });
    return;
  }
  const C = CONTENT, S = C.studio || {};
  const $ = id => document.getElementById(id);
  const arr = a => Array.isArray(a) ? a : [];
  const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const rows = a => arr(a).filter(isRecord);
  const live = a => rows(a).filter(x => !x.hidden);
  const txt = v => v == null ? '' : String(v);

  /* ---------- checks: each returns the value when it is safe, otherwise '' ---------- */
  const YT_ID  = /^[A-Za-z0-9_-]{11}$/;
  const IMG_LOCAL = /^[A-Za-z0-9._-]+\.(jpe?g|png|webp)$/i;
  const IMG_YT = /^https:\/\/i\.ytimg\.com\/[A-Za-z0-9_\-\/.?=&%]+$/;
  const MAILTO_OK = /^mailto:[^\s<>"'`\\]+$/;                      /* only used for mail links the page builds itself */
  const BAD_CHARS = /[\u0000- \u007f-\u009f\\<>"'`]/;          /* spaces, hidden characters, backslash, quote-like marks */
  const LOGO_OK = /^logos\/[A-Za-z0-9._-]+\.(svg|png|webp|jpe?g|SVG|PNG|WEBP|JPE?G)$/;   /* partner logos: only files inside the (lowercase) logos/ folder next to the page */
  const ytId  = v => (typeof v === 'string' && YT_ID.test(v)) ? v : '';
  const logo  = v => (typeof v === 'string' && LOGO_OK.test(v) && v.indexOf('..') === -1) ? v : '';
  const img   = v => (typeof v === 'string' && (IMG_LOCAL.test(v) || IMG_YT.test(v))) ? v : '';
  /* web link: lowercase https:// only, parsed (not pattern-matched); no login details, a real host, no hidden characters */
  const web   = v => {
    if(typeof v !== 'string' || v.indexOf('https://') !== 0 || BAD_CHARS.test(v)) return '';
    const authority = v.slice(8).split(/[\/?#]/)[0];
    if(!authority || authority.indexOf('@') !== -1) return '';
    try {
      const u = new URL(v);
      if(u.protocol !== 'https:' || u.username || u.password || !u.hostname || u.hostname.indexOf('.') === -1) return '';
    } catch(e){ return ''; }
    return v;
  };
  const link  = v => web(v) || ((typeof v === 'string' && MAILTO_OK.test(v)) ? v : '');
  /* email: exactly one @, plain letters/digits/. _ + - only (no %), no double dots, no dot at the start or end of either part */
  const email = v => {
    if(typeof v !== 'string' || v.length < 6 || v.length > 254) return '';
    const parts = v.split('@');
    if(parts.length !== 2) return '';
    const l = parts[0], d = parts[1];
    if(!l || !d || l.length > 64) return '';
    if(!/^[A-Za-z0-9._+-]+$/.test(l) || !/^[A-Za-z0-9.-]+$/.test(d)) return '';
    if(l[0] === '.' || l[l.length - 1] === '.' || d[0] === '.' || d[d.length - 1] === '.') return '';
    if(l.indexOf('..') !== -1 || d.indexOf('..') !== -1) return '';
    if(!/\.[A-Za-z]{2,}$/.test(d)) return '';
    if(d.split('.').some(x => x[0] === '-' || x[x.length - 1] === '-')) return '';
    return v;
  };
  const mailAddr = a => encodeURIComponent(a).replace(/%40/g, '@');    /* encode everything except the @ */

  /* ---------- builder: makes elements with properties, never from raw text ---------- */
  function el(tag, o, kids){
    const n = document.createElement(tag);
    if(o) Object.keys(o).forEach(k => {
      const v = o[k];
      if(v == null || v === false) return;
      if(/^on/i.test(k)) return;                                   /* no inline handlers, ever */
      if(k === 'class') n.className = v;
      else if(k === 'text') n.textContent = v;
      else if(k === 'data') Object.keys(v).forEach(d => { n.dataset[d] = v[d]; });
      else if(k === 'css') n.style.cssText = v;
      else if(k === 'href'){ const l = link(v); if(l) n.setAttribute('href', l); }
      else if(k === 'src'){ const i = img(v) || logo(v); if(i) n.setAttribute('src', i); }
      else n.setAttribute(k, v === true ? '' : v);
    });
    arr(kids).forEach(c => {
      if(c == null || c === false || c === '') return;
      n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return n;
  }

  /* an item can be shown when it has a good YouTube id, or (no id) a good https link */
  const playable = p => !!p && (p.id ? !!ytId(p.id) : !!web(p.url));

  function thumbImg(p){
    const id = ytId(p.id);
    const main = img(p.thumb) || (id ? `https://i.ytimg.com/vi/${id}/maxresdefault.jpg` : '');
    if(!main) return null;
    const fbUrl = id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '';
    const im = el('img', { alt: txt(p.title), loading: 'lazy' });
    im.addEventListener('error', function onErr(){
      im.removeEventListener('error', onErr);                      /* fall back once, never loop */
      if(fbUrl && im.getAttribute('src') !== fbUrl) im.src = fbUrl;
    });
    im.src = main;
    return im;
  }

  function shot(p, cls){
    cls = cls || 'r169';
    if(!playable(p)) return null;
    const title = txt(p.title);
    if(!p.id){
      const bg = img(p.thumb);
      const url = web(p.url);
      let insta = false;
      try { const h = new URL(url).hostname; insta = (h === 'www.instagram.com' || h === 'instagram.com'); } catch(e){ insta = false; }
      return el('a', { class: 'shot ext ' + cls, href: url, target: '_blank', rel: 'noopener',
                       'aria-label': insta ? `Watch ${title} on Instagram (opens in a new tab)` : `Watch ${title} (opens in a new tab)` }, [
        bg ? el('img', { src: bg, alt: '', loading: 'lazy', css: 'position:absolute;inset:0;opacity:.55' }) : null,
        el('span', { css: 'position:relative', text: insta ? 'Watch on Instagram ↗' : 'Watch video ↗' })
      ]);
    }
    return el('div', { class: 'shot ' + cls, role: 'button', tabindex: '0', 'aria-label': `Play ${title}`,
                       data: { id: ytId(p.id), ratio: txt(p.ratio) } }, [
      thumbImg(p),
      el('span', { class: 'play' })
    ]);
  }
  function tags(p){
    return [
      p.label   ? el('span', { class: 'tag g', text: txt(p.label) }) : null,
      p.ratio   ? el('span', { class: 'tag', text: txt(p.ratio) }) : null,
      p.lang    ? el('span', { class: 'tag', text: txt(p.lang) }) : null,
      p.partner ? el('span', { class: 'tag p', text: txt(p.partner) }) : null
    ];
  }
  function card(p){
    return el('article', { class: 'card' }, [
      shot(p, p.ratio === '9:16' ? 'r916' : 'r169'),
      el('div', { class: 'card-body' }, [
        el('h3', { class: 'card-title', text: txt(p.title) }),
        el('div', { class: 'tags' }, tags(p)),
        p.desc  ? el('p', { text: txt(p.desc) }) : null,
        p.craft ? el('div', { class: 'craft', text: txt(p.craft) }) : null
      ])
    ]);
  }
  const mailto = subject => `mailto:${mailAddr(email(S.email))}?subject=${encodeURIComponent(subject)}`;
  const fill = (id, kids) => { const n = $(id); if(!n) return; n.textContent = ''; arr(kids).forEach(k => { if(k) n.appendChild(k); }); };

  /* hero */
  const still = img(S.heroStill);
  if(still) $('still').style.backgroundImage = `url("${still}")`;
  $('heroEyebrow').textContent = txt(S.eyebrow);
  const hh = $('heroHead'); hh.textContent = '';
  txt(S.headline).split('\n').forEach(line => { if(line.trim()) hh.appendChild(el('span', { class: 'hl', text: line })); });
  $('heroLine').textContent = txt(S.line);

  /* awards */
  const TROPHY = `<svg class="trophy" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M7 3h10v6a5 5 0 0 1-10 0V3z"/><path d="M7 5H4v2a4 4 0 0 0 3 3.87"/><path d="M17 5h3v2a4 4 0 0 1-3 3.87"/>
    <path d="M12 14v4"/><path d="M9 21h6"/><path d="M10 18h4l.6 3H9.4L10 18z"/></svg>`;   /* fixed drawing, no content values in it */
  const trophy = () => { const t = document.createElement('div'); t.innerHTML = TROPHY; return t.firstElementChild; };
  fill('awards', rows(C.awards).map(a => {
    const aid = ytId(a.id);
    const inner = [ trophy(), el('div', null, [
      el('div', { class: 'rank', text: txt(a.rank) }),
      el('h3', { text: txt(a.title) }),
      a.note ? el('p', null, [ txt(a.note), aid ? ' · ' : '', aid ? el('b', { text: 'Watch ▸' }) : null ]) : null
    ]) ];
    return aid
      ? el('button', { type: 'button', class: 'award play-link', data: { id: aid, ratio: txt(a.ratio) } }, inner)
      : el('div', { class: 'award' }, inner);
  }));

  /* selected */
  const selected = live(C.selected).filter(playable);

  /* hero background: the original rotating pictures (YouTube ids in content.js: studio.heroPictures), up to 7, 7s apart.
     The cycle is 7s x pictures but never shorter than the original 40s (so 4 pictures keep the original 40s timing); the single still stays if fewer than two */
  const rotPics = [];
  arr(S.heroPictures).forEach(v => {
    const id = ytId(v);
    if(id && rotPics.length < 7) rotPics.push(`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`);
  });
  if(rotPics.length >= 2){
    const box = $('still');
    const cycle = Math.max(40, rotPics.length * 7);
    const pc = t => (t / cycle * 100).toFixed(3) + '%';
    const st = document.createElement('style');
    /* longer cycle: keep every picture's fade-in (3.2s), hold (to 8s) and fade-out (to 11.2s) exactly as long as in the original 40s cycle */
    st.textContent = (cycle > 40 ? `@keyframes gaten{0%,100%{opacity:0}${pc(3.2)},${pc(8)}{opacity:var(--peak,.46)}${pc(11.2)}{opacity:0}}` : '')
      /* phones only (same 600px as the phone hero): each picture is fully gone by the 7s handover, so two never show together */
      + `@keyframes gatep{0%,100%{opacity:0}${pc(2.1)},${pc(4.9)}{opacity:var(--peak,.46)}${pc(7)}{opacity:0}}@media(max-width:600px){.still.rot i{animation-name:gatep!important}}`;
    document.head.appendChild(st);
    box.style.backgroundImage = 'none';
    box.classList.add('rot');
    rotPics.forEach((pic, i) => {
      const layer = document.createElement('i');
      layer.style.backgroundImage = `url("${pic}")`;
      if(cycle > 40) layer.style.animationName = 'gaten';
      layer.style.animationDuration = cycle + 's';
      layer.style.animationDelay = (i * 7) + 's';
      box.appendChild(layer);
    });
  }

  fill('selected', selected.map((p, i) => {
    const v = p.ratio === '9:16';
    return el('article', { class: `feat-item ${v ? 'tall' : 'wide'}${i % 2 ? ' flip' : ''}` }, [
      el('div', { class: 'feat-media' }, [ shot(p, v ? 'r916' : 'r169') ]),
      el('div', { class: 'feat-copy' }, [
        el('h3', { class: 'card-title', text: txt(p.title) }),
        el('div', { class: 'tags' }, tags(p)),
        el('p', { text: txt(p.desc) }),
        p.craft ? el('div', { class: 'craft', text: txt(p.craft) }) : null
      ])
    ]);
  }));

  /* services */
  fill('svc', rows(C.services).map(s => {
    const example = s.example;
    const media = isRecord(example) ? shot(example, 'r169') : null;
    return el('article', { class: 'svc-card' }, [
      media,
      el('div', { class: 'svc-body' }, [
        el('h3', { text: txt(s.title) }),
        el('p', { text: txt(s.line) }),
        media ? el('div', { class: 'svc-ex' }, [
          'Example: ', el('b', { text: txt(example.title) }), example.label ? ` · ${txt(example.label)}` : ''
        ]) : null
      ])
    ]);
  }));

  /* all work: other pieces first, then the selected four */
  const workAll = [...live(C.work).filter(playable), ...selected];
  const labels = {'film':'Films','music-video':'Music videos','ad':'Ads','series':'Series','reel':'Showreels'};
  const order = ['film','music-video','ad','series','reel'];

  /* series: needs at least one good episode */
  const seriesList = live(C.series).map(s => ({ s, eps: rows(s.episodes).filter(e => ytId(e.id)) })).filter(x => x.eps.length);
  const has = c => c === 'series' ? seriesList.length > 0 : workAll.some(p => p.cat === c);
  const grid = $('workGrid'), FIRST = 6;
  let filter = 'all', expanded = false;
  function draw(){
    const list = workAll.filter(p => filter === 'all' || p.cat === filter);
    const cut = (filter === 'all' && !expanded) ? list.slice(0, FIRST) : list;
    fill('workGrid', cut.map(card));
    grid.style.display = cut.length ? '' : 'none';
    $('moreWrap').style.display = (filter === 'all' && !expanded && list.length > FIRST) ? '' : 'none';
    $('seriesWrap').style.display = (filter === 'all' || filter === 'series') ? '' : 'none';
    $('creditsWrap').style.display = (filter === 'all' || filter === 'film') ? '' : 'none';
    $('extraHead').style.display = filter === 'all' ? '' : 'none';
    reveal();
  }
  fill('chips', [ el('button', { class: 'chip on', 'aria-pressed': 'true', data: { f: 'all' }, text: 'All' }) ].concat(
    order.filter(has).map(c => el('button', { class: 'chip', 'aria-pressed': 'false', data: { f: c }, text: labels[c] }))));
  $('chips').addEventListener('click', e => {
    const b = e.target.closest('.chip'); if(!b) return;
    document.querySelectorAll('.chip').forEach(x => { x.classList.remove('on'); x.setAttribute('aria-pressed', 'false'); });
    b.classList.add('on'); b.setAttribute('aria-pressed', 'true'); filter = b.dataset.f; draw();
  });
  $('moreBtn').addEventListener('click', () => { expanded = true; draw(); });

  /* series */
  fill('seriesWrap', seriesList.map(x => {
    const s = x.s, first = x.eps[0];
    return el('div', { class: 'series' }, [
      el('div', null, [ shot({ id: first.id, ratio: s.ratio, title: s.title, thumb: s.thumb || '' }, 'r169') ]),
      el('div', null, [
        el('div', { class: 'tags' }, [
          el('span', { class: 'tag', text: txt(s.ratio) }),
          el('span', { class: 'tag', text: 'EN + HI' }),
          el('span', { class: 'tag', text: txt(s.count) })
        ]),
        el('h3', { class: 'card-title', css: 'font-size:30px;margin:10px 0 12px', text: txt(s.title) }),
        el('p', { css: 'color:#CDD3DE;font-size:16px', text: txt(s.desc) }),
        s.craft ? el('div', { class: 'craft', text: txt(s.craft) }) : null,
        el('div', { class: 'eps' }, x.eps.map(e =>
          el('button', { type: 'button', class: 'ep play-link', data: { id: ytId(e.id), ratio: txt(s.ratio) }, text: txt(e.label) })))
      ])
    ]);
  }));

  /* credits */
  fill('creditsWrap', live(C.credits).map(c =>
    el('div', { class: 'credit' }, [
      el('h3', { text: txt(c.title) }),
      el('div', { class: 'edge', css: 'margin-top:6px;color:var(--gold)', text: txt(c.meta) }),
      el('p', { text: txt(c.desc) })
    ])));

  /* process */
  fill('steps', rows(C.process).map((s, i) =>
    el('div', { class: 'stepc' }, [
      el('div', { class: 'n', text: '0' + (i + 1) }),
      el('h3', { text: txt(s.step) }),
      el('p', { text: txt(s.line) })
    ])));

  /* partnerships */
  const P = C.partnerships || {};
  const groups = rows(P.groups);
  const words = ['zero','one','two','three','four','five','six','seven','eight','nine','ten'];
  const platTotal = groups.reduce((n, g) => n + arr(g.platforms).length, 0);
  $('platCount').textContent = words[platTotal] || platTotal;
  /* partner logos: a logo (only from logos/) with the company name beneath; the plain name when no allowed logo is given.
     A platform may still be a plain string (old format). */
  function partnerItem(p){
    const name = isRecord(p) ? txt(p.name) : txt(p);
    if(!name) return null;
    const lg = isRecord(p) ? logo(p.logo) : '';
    if(!lg) return el('div', { class: 'pt-item pt-plain' }, [ el('div', { class: 'pt-logo' }, [ el('span', { class: 'pt-text', text: name }) ]) ]);
    const h = (typeof p.h === 'number' && p.h >= 12 && p.h <= 44) ? p.h : 26;
    const im = el('img', { class: 'pl' + (p.round ? ' round' : ''), src: lg, alt: name, decoding: 'async' });
    im.style.setProperty('--h', String(h));
    return el('div', { class: 'pt-item' }, [ el('div', { class: 'pt-logo' }, [ im ]), el('span', { text: name, 'aria-hidden': 'true' }) ]);
  }
  const badgeFor = p => {
    const b = isRecord(p) ? logo(p.badge) : '';
    return b ? el('img', { class: 'pt-badge', src: b, alt: txt(p.badgeAlt) || (txt(p.name) + ' badge'), decoding: 'async' }) : null;
  };
  /* top of the page: slim logo row inside the hero (ambassador first, then the creative partners) */
  const topGroups = groups.map(g => {
    const plats = arr(g.platforms);
    const items = plats.map(partnerItem).filter(Boolean);
    if(!items.length) return null;
    return el('div', { class: 'pt-group' }, [
      el('div', { class: 'pt-label', text: txt(g.label) }),
      el('div', { class: 'pt-items' + (plats.some(p => badgeFor(p)) ? ' has-badge' : '') }, items.concat(plats.map(badgeFor).filter(Boolean)))
    ]);
  }).filter(Boolean);
  fill('partnersTop', topGroups.length ? [ el('div', { class: 'pt' }, topGroups) ] : []);
  /* bottom Partnerships section: the same logos, larger */
  fill('platList', groups.map(g =>
    el('div', { class: 'plat-group' }, [
      el('span', { class: 'edge', text: txt(g.label) }),
      el('div', { class: 'pt-items pt-bottom' }, arr(g.platforms).map(partnerItem).filter(Boolean))
    ])));
  const R = P.reach;
  fill('reach', isRecord(R) && !R.hidden ? [
    el('div', null, [
      el('div', { class: 'edge', css: 'margin-bottom:10px', text: 'Combined audience' }),
      el('div', { class: 'big', text: txt(R.total) })
    ]),
    el('div', { class: 'split' }, rows(R.split).map(s =>
      el('div', null, [ txt(s.label) + ' ', el('b', { text: txt(s.value) }) ])))
  ] : []);

  /* about + contact */
  $('aboutTxt').textContent = txt(S.about);
  $('aboutName').textContent = txt(S.director);
  const portrait = img(S.portrait);
  if(portrait){ $('portraitImg').src = portrait; $('navMark').style.backgroundImage = `url("${portrait}")`; }
  else { $('navMark').remove(); const f = $('portraitImg').closest('figure'); f.closest('.who').style.gridTemplateColumns = '1fr'; f.remove(); }
  if(email(S.email)){
    const m = $('mailLink'); m.textContent = S.email; m.href = 'mailto:' + mailAddr(S.email);
    $('prodBtn').href = mailto('New production enquiry');
    $('partnerBtn').href = $('partnerBtn2').href = mailto('Creator partnership enquiry');
  } else {
    ['mailLink','prodBtn','partnerBtn','partnerBtn2'].forEach(id => { $(id).hidden = true; });
  }
  fill('socials', rows(S.socials).filter(s => s.label && web(s.url)).map(s =>
    el('a', { href: web(s.url), target: '_blank', rel: 'noopener', text: `${txt(s.label)} ↗` })));
  $('yr').textContent = new Date().getFullYear();

  /* lightbox */
  const lb = $('lb'), frame = $('lbFrame'); let lastFocus = null;
  function open(id, ratio){
    id = ytId(id); if(!id) return;
    lastFocus = document.activeElement;
    frame.className = 'lb-frame' + (ratio === '9:16' ? ' v' : '');
    const f = document.createElement('iframe');
    f.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&modestbranding=1`;
    f.allow = 'autoplay; encrypted-media; fullscreen';
    f.allowFullscreen = true;
    f.title = 'Video player';
    frame.textContent = ''; frame.appendChild(f);
    lb.classList.add('open'); document.body.style.overflow = 'hidden';
    behind(true); $('lbClose').focus();
  }
  /* while the player is open, the page behind it cannot be reached by keyboard or screen reader */
  function behind(on){ document.querySelectorAll('body > nav, body > header, body > div.awards, body > section, body > footer').forEach(el => { el.inert = on; }); }
  function close(){
    if(!lb.classList.contains('open')) return;
    lb.classList.remove('open'); frame.textContent = ''; document.body.style.overflow = ''; behind(false);
    if(lastFocus && lastFocus.focus) lastFocus.focus();
  }
  const reel = S.showreel || {};
  if(ytId(reel.id)) $('reelBtn').addEventListener('click', () => open(reel.id, reel.ratio));
  else $('reelBtn').hidden = true;
  document.addEventListener('click', e => {
    const t = e.target.closest('.shot[data-id],.play-link');
    if(t && t.dataset.id){ open(t.dataset.id, t.dataset.ratio); return; }
    if(e.target.id === 'lbClose' || e.target === lb) close();
  });
  document.addEventListener('keydown', e => {
    if(e.key === 'Escape') close();
    const a = document.activeElement;
    if((e.key === 'Enter' || e.key === ' ') && a && a.matches('.shot[data-id]')){ e.preventDefault(); open(a.dataset.id, a.dataset.ratio); }
  });

  /* nav */
  addEventListener('scroll', () => $('nav').classList.toggle('stuck', scrollY > 40), { passive: true });

  /* reveal — safe by design: nothing is hidden unless this code is running,
     anything already on screen shows at once, and a timer shows everything as a last resort. */
  let io = null;
  function reveal(){
    const els = document.querySelectorAll('.feat-item:not(.in), .svc-card:not(.in), .grid > .card:not(.in), .series:not(.in), .credit:not(.in), .stepc:not(.in)');
    els.forEach(el => {
      el.classList.add('rv');
      if(!io || el.getBoundingClientRect().top < innerHeight) el.classList.add('in');
      else io.observe(el);
    });
  }
  if('IntersectionObserver' in window){
    io = new IntersectionObserver(es => es.forEach(x => { if(x.isIntersecting){ x.target.classList.add('in'); io.unobserve(x.target); } }), { threshold: 0, rootMargin: '0px 0px -6% 0px' });
    document.documentElement.classList.add('js');
  }
  draw();
  /* backup: on every scroll, show anything that has reached the screen, even if the observer missed it */
  let tick = false;
  addEventListener('scroll', () => { if(tick) return; tick = true; requestAnimationFrame(() => { tick = false;
    document.querySelectorAll('.rv:not(.in)').forEach(el => { if(el.getBoundingClientRect().top < innerHeight) el.classList.add('in'); }); }); }, { passive: true });

  /* last action: hide the failed-load fallback, but ONLY if a valid email address was really put on the page */
  const fallback = document.getElementById('heroFallback');
  const mailLink = document.getElementById('mailLink');
  const mailShown = !!(mailLink && !mailLink.hidden && email(S.email) && mailLink.getAttribute('href') === 'mailto:' + mailAddr(S.email));
  if(fallback && mailShown) fallback.hidden = true;
})();
