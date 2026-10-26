/* ANDROMEDA CONSULT - интерфейс */
(function () {
  'use strict';

  /* --- мобильное меню --- */
  var burger = document.querySelector('.burger');
  var nav = document.querySelector('.nav');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', nav.classList.contains('open') ? 'true' : 'false');
    });
  }

  /* --- выпадающее меню «Услуги» --- */
  document.querySelectorAll('.drop > button').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var d = btn.parentElement;
      document.querySelectorAll('.drop').forEach(function (x) { if (x !== d) x.classList.remove('open'); });
      d.classList.toggle('open');
    });
  });
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.drop')) {
      document.querySelectorAll('.drop').forEach(function (d) { d.classList.remove('open'); });
    }
  });

  /* --- cookie --- */
  var ck = document.getElementById('cookieBar');
  if (ck) {
    var KEY = 'andromeda_consult_cookie_ok';
    try {
      if (!localStorage.getItem(KEY)) ck.classList.add('show');
    } catch (err) { ck.classList.add('show'); }
    var okBtn = ck.querySelector('[data-cookie-ok]');
    if (okBtn) okBtn.addEventListener('click', function () {
      try { localStorage.setItem(KEY, '1'); } catch (err) {}
      ck.classList.remove('show');
    });
  }

  /* --- калькулятор Сколково --- */
  var calc = document.getElementById('skCalc');
  if (calc) {
    var num = function (id) {
      var el = document.getElementById(id);
      if (!el) return 0;
      var v = String(el.value).replace(/\s/g, '').replace(',', '.');
      var n = parseFloat(v);
      return isFinite(n) && n > 0 ? n : 0;
    };
    var fmt = function (v, dec) {
      if (!isFinite(v)) return '-';
      return v.toLocaleString('ru-RU', { minimumFractionDigits: dec || 0, maximumFractionDigits: dec || 0 });
    };
    var el;
    var keys = ['rev', 'prof', 'payroll', 'staff', 'growth', 'years'];
    keys.forEach(function (k) {
      el = document.getElementById(k);
      if (el) el.addEventListener('input', recalc);
      if (el) el.addEventListener('change', recalc);
    });

    function recalc() {
      var rev = num('rev');          // выручка, млн ₽
      var prof = num('prof');        // прибыль до налога, млн ₽
      var payroll = num('payroll');  // ФОТ, млн ₽
      var staff = num('staff');      // численность, чел.
      var growth = num('growth');    // рост показателей, %
      var years = Math.min(15, Math.max(1, Math.round(num('years') || 10)));

      var threshold = 40639.5;       // 1,5 МРОТ 2026, ₽ в месяц
      var salary = staff > 0 ? (payroll * 1e6) / (staff * 12) : 0;
      var payrollUnder = staff > 0 ? (staff * 12 * threshold) / 1e6 : 0; // млн ₽ в пределах порога

      var profBefore = prof * 0.25;
      var profAfter = 0;
      var payBefore = payroll * 0.302;
      var payAfter = staff > 0
        ? 0.30 * Math.min(payroll, payrollUnder) + 0.15 * Math.max(0, payroll - payrollUnder)
        : payBefore;
      var yearGain = (profBefore - profAfter) + (payBefore - payAfter);

      var total = 0, g = 1 + growth / 100;
      for (var i = 0; i < years; i++) { total += yearGain * Math.pow(g, i); }

      var taxNow = profBefore + payBefore;
      var taxAfter = profAfter + payAfter;
      var drop = taxNow > 0 ? (1 - taxAfter / taxNow) * 100 : 0;

      var setTxt = function (id, v) { var x = document.getElementById(id); if (x) x.textContent = v; };
      setTxt('outYear', fmt(yearGain, 1));
      setTxt('outTotal', fmt(total, 1));
      setTxt('outPerMln', rev > 0 ? fmt((yearGain * 1000) / rev, 1) : '-');
      setTxt('outProfNow', fmt(profBefore, 1));
      setTxt('outPayNow', fmt(payBefore, 1));
      setTxt('outProfAfter', fmt(profAfter, 1));
      setTxt('outPayAfter', fmt(payAfter, 1));
      setTxt('outSalary', staff > 0 ? fmt(salary, 0) : '-');
      setTxt('outDrop', fmt(drop, 0) + '%');
      setTxt('outYears', String(years));

      var flags = document.getElementById('calcFlags');
      if (flags) {
        var msgs = [];
        if (rev > 1000) {
          msgs.push('<div class="flag warn">Выручка больше 1 млрд ₽: прямые льготы резидента к такой компании не применяются (лимит по выручке - 1 млрд ₽, по чистой прибыли - 300 млн ₽). Для крупных компаний работает схема с отдельным научно-исследовательским центром - резидентом Сколково; расчёт для неё делается отдельно.</div>');
        }
        if (prof > 300) {
          msgs.push('<div class="flag warn">Чистая прибыль выше 300 млн ₽ - лимит по прибыли превышен. Нужна структура с отдельным юрлицом, где концентрируется профильная деятельность.</div>');
        }
        if (staff < 1) {
          msgs.push('<div class="flag warn">Укажите численность сотрудников: без неё не считается средняя зарплата, а без неё не применить порог 1,5 МРОТ - экономия по взносам в расчёте не показывается.</div>');
        }
        if (staff > 0 && salary > 0 && salary <= threshold) {
          msgs.push('<div class="flag warn">Средняя зарплата по компании не выше 1,5 МРОТ: льготный тариф коснётся большинства выплат, эффект по взносам получается небольшим. Основную экономию даст 0 % по налогу на прибыль.</div>');
        }
        if (prof <= 0) {
          msgs.push('<div class="flag warn">Прибыли нет: экономия считается только по страховым взносам (30% → 15%). Налог на прибыль 0% даст эффект, когда компания выйдет в плюс.</div>');
        }
        if (rev > 0 && rev <= 1000 && prof <= 300 && prof > 0) {
          msgs.push('<div class="flag ok">Компания укладывается в лимиты участника Сколково: можно применять и 0% по налогу на прибыль, и 15% по страховым взносам.</div>');
        }
        flags.innerHTML = msgs.join('');
      }
    }
    recalc();
  }

  /* --- формы заявок: отправка в наш сервис приёма заявок --- */
  var LEAD_API = 'https://agrosignal.mypetlab.org/contracts/andromeda.site-lead-api/1.0/lead';
  var LEAD_KEY = '0bc512399e2f6838846f71c8e679dd9db9d7b847510da086463c8aeabb06b2fd';
  var LEAD_FIELDS = ['name', 'phone', 'email', 'company', 'program', 'material', 'topic', 'slot', 'question', 'comment'];

  function sendLead(payload) {
    return fetch(LEAD_API + '?key=' + LEAD_KEY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json(); });
  }

  document.querySelectorAll('form[data-lead]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var data = {};
      new FormData(form).forEach(function (v, k) {
        if (LEAD_FIELDS.indexOf(k) >= 0) data[k] = String(v).trim();
      });
      var msg = form.querySelector('.form-msg');
      var btn = form.querySelector('button[type=submit]');
      var name = data.name || '';
      var phone = data.phone || '';
      if (name.length < 2) { return showMsg(msg, 'err', 'Укажите имя, пожалуйста.'); }
      if (phone.replace(/\D/g, '').length < 10 && !(data.email && data.email.indexOf('@') > 0)) {
        return showMsg(msg, 'err', 'Нужен телефон или e-mail: иначе не сможем ответить.');
      }

      data.kind = form.getAttribute('data-lead');
      data.page = location.pathname.split('/').pop() || 'index.html';
      if (btn) btn.disabled = true;
      showMsg(msg, 'ok', 'Отправляем заявку…');

      sendLead(data).then(function (d) {
        if (d && d.ok) {
          showMsg(msg, 'ok', 'Заявка ' + (d.id || '') + ' принята. Ответим в течение рабочего дня на указанный контакт. Если вопрос срочный, позвоните: 8 916 770-25-55.');
          form.reset();
        } else {
          showMsg(msg, 'err', (d && d.error) || 'Заявку не удалось отправить. Позвоните: 8 916 770-25-55.');
        }
      }).catch(function () {
        showMsg(msg, 'err', 'Связи с сервером нет. Позвоните: 8 916 770-25-55 или напишите на info@andromedaconsult.ru.');
      }).then(function () {
        if (btn) btn.disabled = false;
      });
    });
  });
  function showMsg(el, cls, text) {
    if (!el) return;
    el.className = 'form-msg ' + cls;
    el.textContent = text;
  }

  /* --- кнопка «получить материал» подставляет материал в форму --- */
  document.querySelectorAll('[data-material]').forEach(function (link) {
    link.addEventListener('click', function () {
      var sel = document.getElementById('m-material');
      if (!sel) return;
      var want = (link.getAttribute('data-material') || '').trim();
      for (var i = 0; i < sel.options.length; i++) {
        if (sel.options[i].text.trim() === want) { sel.selectedIndex = i; break; }
      }
    });
  });

  /* --- «спроси про программу» на главной --- */
  var askForm = document.getElementById('askForm');
  if (askForm) {
    askForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var q = (document.getElementById('askInput') || {}).value || '';
      q = q.trim();
      if (q.length < 4) return;
      window.location.href = 'consultation.html?q=' + encodeURIComponent(q) + '#form';
    });
  }

  /* --- вопрос с главной переносится в поле заявки --- */
  (function () {
    var m = (location.search || '').match(/[?&]q=([^&]*)/);
    if (!m) return;
    var box = document.getElementById('c-comment');
    if (!box) return;
    try {
      var q = decodeURIComponent(m[1].replace(/\+/g, ' '));
      if (q && !box.value) box.value = 'Вопрос: ' + q;
    } catch (err) {}
  })();

  /* --- новости из Telegram-канала --- */
  var newsList = document.getElementById('newsList');
  var newsPrev = document.getElementById('newsPreview');
  if (newsList || newsPrev) {
    fetch('assets/news.json', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var items = (d && d.items) || [];
        renderNews(newsList, items);
        renderNews(newsPrev, items.slice(0, 3));
      })
      .catch(function () {});
  }
  function clean(html) {
    return String(html || '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
      .replace(/javascript:/gi, '');
  }
  function fmtDate(iso) {
    if (!iso) return '';
    var dt = new Date(iso);
    if (isNaN(dt.getTime())) return '';
    var p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return p(dt.getDate()) + '.' + p(dt.getMonth() + 1) + '.' + dt.getFullYear() + ' · ' + p(dt.getHours()) + ':' + p(dt.getMinutes());
  }
  function renderNews(el, items) {
    if (!el || !items.length) return;
    el.innerHTML = items.map(function (p) {
      var img = p.image ? '<div style="margin:12px 0 0"><img src="' + p.image + '" alt="" style="border-radius:10px;max-width:100%"></div>' : '';
      return '<div class="news-item"><div class="date">' + fmtDate(p.date) +
        '</div><div class="txt">' + clean(p.html || p.text) + '</div>' + img + '</div>';
    }).join('');
  }

  /* --- появление блоков: ровный подъём с шагом в 45 мс --- */
  var soft = document.querySelectorAll('.card, .case, .step, .consult-band');
  if (soft.length) {
    var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!calm && ('IntersectionObserver' in window)) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add('in');
            io.unobserve(en.target);
          }
        });
      }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
      soft.forEach(function (el, i) {
        el.classList.add('reveal');
        el.style.setProperty('--i', String(i % 4));
        io.observe(el);
      });
    }
  }

  /* --- волосяной индикатор прочтения страницы --- */
  if (!window.matchMedia || !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    var bar = document.createElement('div');
    bar.className = 'scroll-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    var raf = 0;
    var paint = function () {
      raf = 0;
      var doc = document.documentElement;
      var span = doc.scrollHeight - window.innerHeight;
      var p = span > 0 ? Math.min(1, Math.max(0, window.pageYOffset / span)) : 0;
      bar.style.width = (p * 100).toFixed(2) + '%';
    };
    var onScroll = function () { if (!raf) raf = window.requestAnimationFrame(paint); };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    paint();
  }

  /* --- год в подвале --- */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });
})();
