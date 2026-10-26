/* Инструменты сайта: подбор программы, проверка по ИНН, запись на созвон. */
(function () {
  'use strict';

  function el(id) { return document.getElementById(id); }
  function txt(id, v) { var e = el(id); if (e) e.textContent = v; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- подбор программы ---------- */
  var STATUS_CARDS = [
    { t: 'Сколково', h: 'program-skolkovo.html', a: '0% налог на прибыль, взносы 15%',
      c: 'не требуется', term: 'статус бессрочный',
      d: 'Прямые льготы работают при выручке до 1 млрд ₽ и чистой прибыли до 300 млн ₽.' },
    { t: 'Реестр МТК', h: 'program-mtk.html', a: 'статус и преференции',
      c: 'бесплатно', term: '5 рабочих дней',
      d: 'Пониженное софинансирование грантов, закупки у единственного поставщика, региональные льготы.' }
  ];

  function card(p) {
    var amount = (typeof p.a === 'number') ? ('до ' + p.a + ' млн ₽') : p.a;
    return '<div class="pb-card"><div class="pb-amount">' + esc(amount) + '</div>' +
      '<h4><a href="' + esc(p.h) + '">' + esc(p.t) + '</a></h4>' +
      (p.d ? '<p>' + esc(p.d) + '</p>' : '') +
      '<p class="pb-meta">Софинансирование: ' + esc(p.c) + ' · Срок: ' + esc(p.term) + '</p></div>';
  }

  function podbor() {
    var form = el('pbForm'), rev = el('pbRev'), topic = el('pbTopic'), need = el('pbNeed'), out = el('pbOut');
    if (!form || !out) return;
    var all = window.PROGRAMS || [];

    function lineOf(needVal) {
      if (needVal === 'money5') return ['start', 'start2'];
      if (needVal === 'money10') return ['start2', 'start'];
      if (needVal === 'money30') return ['razvitie'];
      if (needVal === 'money50') return ['comm'];
      return [];
    }

    function render() {
      var f = form.value, r = rev.value, tp = topic.value, nd = need.value;
      var legal = (f === 'ooo' || f === 'ao');
      var buf = [], picked = [], notes = [];

      if (!legal) {
        notes.push('Гранты ФСИ и статус Сколково оформляются только на юридическое лицо. ' +
          'Сначала регистрируем ООО, дальше идём по программе: регистрация занимает 3-5 рабочих дней.');
      }
      if (r === 'gt1000') {
        notes.push('Выручка выше 1 млрд ₽: прямые льготы резидента Сколково к такой компании не применяются. ' +
          'Рабочий путь - отдельное юрлицо с профильной деятельностью либо статус МТК.');
      }

      if (nd === 'taxes' || nd === 'status') {
        if (r !== 'gt1000') picked.push(STATUS_CARDS[0]);
        picked.push(STATUS_CARDS[1]);
        if (nd === 'status') {
          var mtkLine = all.filter(function (p) { return p.s === 'razvitie-mtk'; })[0];
          if (mtkLine) picked.push(mtkLine);
        }
      } else {
        var lines = lineOf(nd);
        lines.forEach(function (ln) {
          // специализированный конкурс важнее общего: сначала короткие списки тем
          var pool = all.filter(function (p) { return p.l === ln && p.tp.indexOf(tp) >= 0; })
            .sort(function (x, y) { return x.tp.length - y.tp.length; });
          if (!pool.length) pool = all.filter(function (p) { return p.l === ln && p.tp.indexOf('other') >= 0; });
          if (pool.length) picked.push(pool[0]);
        });
        if (nd === 'money50') {
          var bs = all.filter(function (p) { return p.s === 'business-start'; })[0];
          if (bs) picked.push(bs);
        }
      }

      var seen = {};
      picked = picked.filter(function (p) { var k = p.t || p.s; if (seen[k]) return false; seen[k] = true; return true; });
      picked = picked.slice(0, 3);

      if (!picked.length) {
        buf.push('<p class="muted">По этим параметрам прямой программы нет. Разбираем индивидуально: часто подходит ' +
          '«Старт-1» через смену тематики или вход через реестр МТК.</p>');
      } else {
        picked.forEach(function (p) { buf.push(card(p)); });
      }
      var notesHtml = notes.map(function (n) { return '<div class="flag warn">' + esc(n) + '</div>'; }).join('');
      out.innerHTML = buf.join('') + notesHtml;
    }

    [form, rev, topic, need].forEach(function (e) {
      if (e) { e.addEventListener('change', render); }
    });
    render();
  }

  /* ---------- проверка по ИНН ---------- */
  function innValid(inn) {
    if (!/^\d{10}$|^\d{12}$/.test(inn)) return false;
    var d = inn.split('').map(Number);
    function chk(digits, weights) {
      var s = 0;
      for (var i = 0; i < weights.length; i++) s += digits[i] * weights[i];
      return (s % 11) % 10;
    }
    if (inn.length === 10) {
      return chk(d, [2, 4, 10, 3, 5, 9, 4, 6, 8]) === d[9];
    }
    var n11 = chk(d, [7, 2, 4, 10, 3, 5, 9, 4, 6, 8]);
    var n12 = chk(d, [3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8]);
    return n11 === d[10] && n12 === d[11];
  }

  function innCheck() {
    var inn = el('innVal');
    if (!inn) return;
    var okv = el('innOkved'), rv = el('innRev'), st = el('innStaff'),
        tax = el('innTax'), fr = el('innForeign'), out = el('innOut');

    function num(e) { var n = parseFloat(String((e && e.value) || '0').replace(',', '.')); return isFinite(n) ? n : 0; }

    // Карточка компании из открытого реестра ФНС
    var INN_API = 'https://agrosignal.mypetlab.org/contracts/andromeda.inn-api/1.0/lookup';
    var INN_KEY = '24651c1fd5343aa6343fe6f484215810c3f0f33f9fda22df47457cb6b7369310';
    var innCache = {}, innPending = {};

    function innHead(val) {
      if (!innCache[val] && !innPending[val]) {
        innPending[val] = 1;
        var url = INN_API + '?inn=' + encodeURIComponent(val) + '&key=' + INN_KEY;
        fetch(url).then(function (r) { return r.json(); }).then(function (d) {
          innCache[val] = d || {};
          delete innPending[val];
          render();
        }).catch(function () {
          innCache[val] = { found: false, reason: 'Реестр ФНС не ответил - критерии ниже считаем по вашим данным' };
          delete innPending[val];
          render();
        });
      }
      var c = innCache[val];
      if (!c) return '<p class="muted">Сверяем ИНН по открытому реестру ФНС…</p>';
      if (!c.found) return '<div class="flag warn">' + esc(c.reason || 'В реестре ФНС нет записи с таким ИНН') + '</div>';
      var lines = [];
      if (c.ogrn) lines.push(['ОГРН', c.ogrn]);
      if (c.region) lines.push(['Регион', c.region]);
      if (c.director) lines.push(['Руководитель', c.director]);
      if (c.reg_date) lines.push(['Дата регистрации', c.reg_date]);
      if (c.status) lines.push(['Статус в реестре', c.status]);
      return '<div class="inn-card"><div class="inn-card-name">' + esc(c.short_name || c.full_name || '') + '</div>' +
        (c.full_name && c.full_name !== c.short_name ? '<div class="inn-card-full">' + esc(c.full_name) + '</div>' : '') +
        lines.map(function (p) {
          return '<div class="inn-card-row"><span>' + esc(p[0]) + '</span><b>' + esc(p[1]) + '</b></div>';
        }).join('') +
        '<div class="inn-card-src">Источник: ' + esc(c.source || 'ЕГРЮЛ ФНС') + '. Выручку, численность и ОКВЭД вводите сами.</div></div>';
    }

    function row(label, value, state, note) {
      var mark = state === 'ok' ? '✓' : (state === 'bad' ? '✗' : '!');
      var cls = state === 'ok' ? 'ok' : (state === 'bad' ? 'warn' : 'warn');
      return '<div class="inn-row ' + cls + '"><span class="inn-mark">' + mark + '</span>' +
        '<span class="inn-label">' + esc(label) + '</span>' +
        '<span class="inn-value">' + esc(value) + '</span>' +
        (note ? '<span class="inn-note">' + esc(note) + '</span>' : '') + '</div>';
    }

    function render() {
      var val = (inn.value || '').replace(/\D/g, '');
      var rows = [], bad = 0, warn = 0;

      if (!val) {
        out.innerHTML = '<p class="muted">Введите ИНН - покажем форму компании и регион, затем проверим остальные критерии.</p>';
        return;
      }
      if (!innValid(val)) {
        out.innerHTML = '<div class="flag warn">ИНН не проходит проверку контрольных цифр. Проверьте ввод: ' +
          'у юрлица 10 цифр, у ИП - 12.</div>';
        return;
      }
      var head = innHead(val);
      var legal = val.length === 10;
      var region = (window.REGIONS || {})[val.slice(0, 2)] || ('код ' + val.slice(0, 2));
      rows.push(row('Форма и ИНН', legal ? 'юрлицо' : 'ИП или физлицо', legal ? 'ok' : 'bad',
        legal ? 'ИНН корректен, регион: ' + region : 'резидентом Сколково и получателем гранта может быть только юрлицо'));
      if (!legal) bad++;

      var ok = okv.value;
      if (ok === 'prod' || ok === 'it' || ok === 'nauk') {
        rows.push(row('Основной ОКВЭД', ok === 'prod' ? 'производство' : (ok === 'it' ? 'ИТ' : 'НИОКР'), 'ok', ''));
      } else if (ok === 'trade' || ok === 'build' || ok === 'other') {
        rows.push(row('Основной ОКВЭД', ok === 'trade' ? 'торговля' : (ok === 'build' ? 'строительство' : 'другое'), 'bad',
          'профиль не проходит: смотрят основной вид деятельности'));
        bad++;
      }

      var rev = num(rv);
      if (rev >= 50) rows.push(row('Выручка', rev.toFixed(0) + ' млн ₽', 'ok', ''));
      else if (rev > 0) { rows.push(row('Выручка', rev.toFixed(0) + ' млн ₽', 'bad', 'ниже порога 50 млн ₽: экономия не покрывает работу по заявке')); bad++; }
      else rows.push(row('Выручка', 'нет данных', 'warn', ''));

      if (rev > 1000) {
        rows.push(row('Лимит участника', 'превышен', 'bad', 'прямые льготы не применяются: нужна структура с отдельным юрлицом'));
        bad++;
      } else if (rev > 0) {
        rows.push(row('Лимит участника', 'в пределах', 'ok', 'выручка до 1 млрд ₽'));
      }

      var staff = num(st);
      if (staff >= 5) rows.push(row('Численность', staff.toFixed(0) + ' чел.', 'ok', ''));
      else if (staff > 0) { rows.push(row('Численность', staff.toFixed(0) + ' чел.', 'bad', 'меньше 5 человек: микропредприятие')); bad++; }

      var t = tax.value;
      if (t === 'osn') rows.push(row('Режим', 'ОСН', 'ok', ''));
      else { rows.push(row('Режим', t === 'usn' ? 'УСН' : 'другой', 'warn',
        'льгота по налогу на прибыль не даёт эффекта, остаются только взносы')); warn++; }

      var f = fr.value;
      if (f === 'offshore') { rows.push(row('Учредители', 'офшор', 'bad', 'офшорный участник закрывает статус резидента полностью')); bad++; }
      else if (f === 'yes') { rows.push(row('Учредители', 'зарубежный участник', 'warn', 'проверяем юрисдикцию: запрет касается только перечней Минфина')); warn++; }
      else rows.push(row('Учредители', 'российские', 'ok', ''));

      var tail;
      if (bad === 0 && warn === 0) {
        tail = '<div class="flag ok">Формально компания подходит: можно считать экономию и готовить заявку. ' +
          'Дальше проверяем структуру владения и что предъявить как инновацию.</div>';
      } else if (bad === 0) {
        tail = '<div class="flag warn">Есть пункты, которые требуют решения до заявки. Сами по себе они не закрывают программу, ' +
          'но меняют расчёт и порядок действий.</div>';
      } else {
        tail = '<div class="flag warn">Есть стоп-факторы. Часть убирается (смена ОКВЭД, выделение профильной деятельности в отдельное юрлицо, ' +
          'смена режима), часть нет. Это и есть тема разбора.</div>';
      }
      out.innerHTML = head + rows.join('') + tail;
    }

    [inn, okv, rv, st, tax, fr].forEach(function (e) {
      if (e) { e.addEventListener('input', render); e.addEventListener('change', render); }
    });
    render();
  }

  /* ---------- запись на созвон ---------- */
  var LEAD_API = 'https://agrosignal.mypetlab.org/contracts/andromeda.site-lead-api/1.0/lead';
  var SLOTS_API = 'https://agrosignal.mypetlab.org/contracts/andromeda.site-lead-api/1.0/slots';
  var LEAD_KEY = '0bc512399e2f6838846f71c8e679dd9db9d7b847510da086463c8aeabb06b2fd';
  var SLOT_TIMES = ['11:00', '11:30', '12:00', '12:30', '13:00', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'];
  var MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  var DAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
  var HOLIDAYS = { '2026-11-04': 1, '2026-12-31': 1, '2027-01-01': 1, '2027-01-02': 1, '2027-01-03': 1,
    '2027-01-04': 1, '2027-01-05': 1, '2027-01-06': 1, '2027-01-07': 1, '2027-01-08': 1,
    '2027-02-23': 1, '2027-03-08': 1, '2027-05-01': 1, '2027-05-09': 1, '2027-06-12': 1 };

  function isHoliday(x) {
    return !!HOLIDAYS[x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate())];
  }

  function fmtDate(d) { return d.getDate() + ' ' + MONTHS[d.getMonth()]; }

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function icsDate(d, hh, mm) {
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(hh) + pad(mm) + '00';
  }

  function booking() {
    var dateSel = el('bkDate');
    if (!dateSel) return;
    var timeSel = el('bkTime'), name = el('bkName'), phone = el('bkPhone'),
        comp = el('bkCompany'), topic = el('bkTopic'), status = el('bkStatus'),
        btn = el('bkSubmit'), icsLink = el('bkIcs'), leftEl = el('bkLeft');

    var days = [], d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 1);
    while (days.length < 15) {
      var wd = d.getDay();
      if (wd >= 1 && wd <= 5 && !isHoliday(d)) days.push(new Date(d.getTime()));
      d.setDate(d.getDate() + 1);
    }
    dateSel.innerHTML = days.map(function (x, i) {
      return '<option value="' + i + '">' + DAYS[x.getDay()] + ', ' + fmtDate(x) + '</option>';
    }).join('');
    timeSel.innerHTML = SLOT_TIMES.map(function (t) {
      return '<option value="' + t + '">' + t + ' МСК</option>';
    }).join('');

    /* занятые слоты: сервер отдаёт список уже забронированных времён */
    var busy = [];
    var busyLoaded = false;
    function slotKey(x, t) {
      return pad(x.getDate()) + '.' + pad(x.getMonth() + 1) + '.' + x.getFullYear() + ', ' + t + ' МСК';
    }
    function freeCount(x) {
      return SLOT_TIMES.filter(function (t) { return busy.indexOf(slotKey(x, t)) < 0; }).length;
    }
    function places(n) {
      var a = n % 10, b = n % 100;
      if (a === 1 && b !== 11) return n + ' место';
      if (a >= 2 && a <= 4 && (b < 10 || b >= 20)) return n + ' места';
      return n + ' мест';
    }
    function renderDates() {
      var cur = +dateSel.value;
      dateSel.innerHTML = days.map(function (x, i) {
        var tail = '', left = freeCount(x);
        if (busyLoaded) {
          tail = left === 0 ? ' · мест нет' : (left === 1 ? ' · последнее место' : ' · ' + places(left));
        }
        return '<option value="' + i + '"' + (busyLoaded && left === 0 ? ' disabled' : '') + '>' +
          DAYS[x.getDay()] + ', ' + fmtDate(x) + tail + '</option>';
      }).join('');
      var pick = -1;
      Array.prototype.forEach.call(dateSel.options, function (o, i) {
        if (pick < 0 && !o.disabled) pick = i;
      });
      if (pick < 0) return;
      var stillOpen = dateSel.options[cur] && !dateSel.options[cur].disabled;
      dateSel.value = String(stillOpen ? cur : pick);
    }
    function renderTimes() {
      var x = days[+dateSel.value] || days[0];
      timeSel.innerHTML = SLOT_TIMES.map(function (t) {
        var k = slotKey(x, t);
        if (busy.indexOf(k) >= 0) return '<option value="' + t + '" disabled>' + t + ' МСК - занято</option>';
        return '<option value="' + t + '">' + t + ' МСК</option>';
      }).join('');
      var free = null;
      Array.prototype.forEach.call(timeSel.options, function (o) {
        if (!o.disabled && free === null) free = o.value;
      });
      if (free !== null) timeSel.value = free;
      if (icsLink) icsLink.style.display = 'none';
      if (busyLoaded && free === null) {
        timeSel.innerHTML = '<option value="">свободных мест не осталось</option>';
        if (btn) btn.disabled = true;
        if (status) status.innerHTML = '<div class="flag warn">На этот день мест нет. Выберите другую дату или позвоните 8 916 770-25-55.</div>';
      } else if (btn) {
        btn.disabled = false;
      }
      if (leftEl && busyLoaded) {
        var left = freeCount(x);
        leftEl.textContent = left === 0 ? 'Свободных мест нет' :
          (left === 1 ? 'Осталось последнее место на этот день' : 'Свободно ' + places(left));
      }
    }
    function loadBusy() {
      return fetch(SLOTS_API + '?key=' + LEAD_KEY).then(function (r) { return r.json(); })
        .then(function (d) { busy = (d && d.busy) || []; busyLoaded = true; renderDates(); renderTimes(); })
        .catch(function () { busyLoaded = true; renderDates(); renderTimes(); });
    }

    function buildIcs(x, time) {
      var hm = time.split(':');
      var startD = new Date(x.getTime());
      startD.setHours(+hm[0], +hm[1], 0, 0);
      var endD = new Date(startD.getTime() + 30 * 60000);
      var start = icsDate(startD, startD.getHours(), startD.getMinutes());
      var end = icsDate(endD, endD.getHours(), endD.getMinutes());
      return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ANDROMEDA CONSULT//RU', 'CALSCALE:GREGORIAN',
        'BEGIN:VEVENT', 'UID:' + Date.now() + '@andromedaconsult.ru',
        'DTSTAMP:' + icsDate(new Date(), 0, 0),
        'DTSTART;TZID=Europe/Moscow:' + start,
        'DTEND;TZID=Europe/Moscow:' + end,
        'SUMMARY:Созвон с ANDROMEDA CONSULT',
        'DESCRIPTION:Разбор ситуации по программам поддержки. 30 минут.',
        'LOCATION:Телефон или видеосвязь',
        'BEGIN:VALARM', 'TRIGGER:-PT30M', 'ACTION:DISPLAY', 'DESCRIPTION:Созвон через 30 минут', 'END:VALARM',
        'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    }

    function current() {
      var x = days[+dateSel.value] || days[0];
      return { date: x, time: timeSel.value };
    }

    function makeIcs() {
      var c = current();
      var blob = new Blob([buildIcs(c.date, c.time)], { type: 'text/calendar;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      icsLink.href = url;
      icsLink.download = 'sozvon-andromeda.ics';
      icsLink.style.display = 'block';
      return url;
    }

    dateSel.addEventListener('change', function () { renderTimes(); });
    timeSel.addEventListener('change', function () { if (icsLink) icsLink.style.display = 'none'; });
    loadBusy();

    btn.addEventListener('click', function () {
      var nm = (name.value || '').trim(), ph = (phone.value || '').trim();
      if (!nm || !ph) {
        status.innerHTML = '<div class="flag warn">Нужны имя и телефон или ник в Telegram: иначе не сможем подтвердить встречу.</div>';
        return;
      }
      var c = current();
      var text = ['Запись на созвон (сайт)', 'Дата: ' + fmtDate(c.date) + ', ' + c.time + ' МСК',
        'Имя: ' + nm, 'Контакт: ' + ph, 'Компания: ' + (comp.value || '-'),
        'Тема: ' + (topic.value || '-'), 'Страница: booking.html', ''].join('\n');
      makeIcs();
      status.innerHTML = '<div class="flag">Отправляем заявку…</div>';
      fetch(LEAD_API + '?key=' + LEAD_KEY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'Запись на созвон',
          name: nm,
          phone: ph,
          company: (comp.value || '').trim(),
          topic: (topic.value || '').trim(),
          slot: slotKey(c.date, c.time),
          page: 'booking.html'
        })
      }).then(function (r) { return r.json(); }).then(function (d) {
        if (!d || !d.ok) throw new Error((d && d.error) || 'сервис занят');
        busy.push(slotKey(c.date, c.time));
        status.innerHTML = '<div class="flag ok">Заявка ' + (d.id || '') + ' принята на ' + fmtDate(c.date) +
          ', ' + c.time + ' МСК. Файл календаря готов - скачайте его ниже, подтверждение придёт в рабочее время.</div>';
        renderDates();
        renderTimes();
      }).catch(function (err) {
        status.innerHTML = '<div class="flag warn">' + ((err && err.message && err.message !== 'сервис занят') ? err.message :
          'Заявку не удалось отправить автоматически. Скачайте файл календаря и позвоните 8 916 770-25-55 - время закрепим за вами.') + '</div>';
        loadBusy();
      });
    });
  }

  /* ---------- сроки открытых программ от робота ---------- */
  function programsDates() {
    var cells = document.querySelectorAll('[data-pk-to]');
    if (!cells.length) return;
    var API = 'https://agrosignal.mypetlab.org/contracts/andromeda.programs-api/1.0/programs';
    var KEY = 'eba4dee056396796f9d883b4f33adae05f385c6585c6608675ece0636092018a';
    var LABEL = { open: ['Приём идёт', 'ok'], always: ['Постоянно', 'gold'],
      watch: ['Следим за датой', ''], soon: ['Окно закрыто', ''] };
    fetch(API + '?key=' + KEY).then(function (r) { return r.json(); }).then(function (d) {
      var items = (d && d.items) || [];
      var byslug = {};
      items.forEach(function (it) { byslug[it.slug] = it; });
      Array.prototype.forEach.call(cells, function (cell) {
        var slug = cell.getAttribute('data-pk-to'), it = byslug[slug];
        if (!it) return;
        if (it.to) cell.textContent = it.to;
        var fromCell = document.querySelector('[data-pk-from="' + slug + '"]');
        if (fromCell && it.from) fromCell.textContent = it.from;
        var st = document.querySelector('[data-pk-status="' + slug + '"]');
        if (st && it.status && LABEL[it.status]) {
          var lab = LABEL[it.status];
          st.innerHTML = '<span class="chip' + (lab[1] ? ' ' + lab[1] : '') + '">' + esc(lab[0]) + '</span>';
        }
      });
      var upd = el('progUpdated');
      if (upd && d.updated) {
        var p = String(d.updated).split('-');
        if (p.length === 3) upd.textContent = p[2] + '.' + p[1] + '.' + p[0];
      }
    }).catch(function () { /* оставляем даты, собранные при сборке сайта */ });
  }

  function init() { podbor(); innCheck(); booking(); programsDates(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
