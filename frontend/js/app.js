(() => {
  'use strict';
  const auth = window.campusAuth,
    page = document.body.dataset.page,
    params = new URLSearchParams(location.search),
    $ = (id) => document.getElementById(id);
  let user;
  const esc = (value) =>
    String(value ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const date = (value) =>
    value
      ? new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
      : '—';
  const bytes = (n) => `${(n / 1024 / 1024).toFixed(2)} MB`;
  function localDate(value) {
    if (!value) return '';
    const d = new Date(value);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }
  const badge = (status) => `<span class="badge ${esc(status)}">${esc(status)}</span>`;
  const link = (href, label, secondary = false) =>
    `<a class="btn${secondary ? ' secondary' : ''}" href="${esc(href)}">${esc(label)}</a>`;
  const empty = (text) => `<div class="empty">${esc(text)}</div>`;
  const staff = () => user.role !== 'student';
  const owner = (a) => user.role === 'admin' || String(a.createdBy?._id || a.createdBy) === user.id;
  function toast(text) {
    $('toast').textContent = text;
    $('toast').hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => {
      $('toast').hidden = true;
    }, 5000);
  }
  function message(text, type = '') {
    const el = $('pageStatus');
    if (el) {
      el.textContent = text;
      el.className = `status ${type}`;
      el.hidden = !text;
      if (type === 'error') el.scrollIntoView({ block: 'nearest' });
    }
  }
  function heading(title, subtitle, actions = '') {
    return `<header class="page-heading"><div><p class="eyebrow">Your campus, connected</p><h1>${esc(title)}</h1><p>${esc(subtitle)}</p></div><div class="actions">${actions}</div></header><p id="pageStatus" class="status" role="status" hidden></p>`;
  }
  function render(html) {
    $('main').innerHTML = html;
    $('main').setAttribute('aria-busy', 'false');
  }
  function metrics(items) {
    return `<div class="stats">${items.map(([label, value, hint]) => `<article class="stat"><span class="stat-label">${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(hint)}</small></article>`).join('')}</div>`;
  }
  function pager(data) {
    if (data.pages <= 1) return '';
    const url = (n) => {
      const q = new URLSearchParams(location.search);
      q.set('page', n);
      return `${location.pathname.split('/').pop()}?${q}`;
    };
    return `<nav class="pager" aria-label="Pagination">${data.page > 1 ? link(url(data.page - 1), 'Previous', true) : ''}<span>Page ${data.page} of ${data.pages}</span>${data.page < data.pages ? link(url(data.page + 1), 'Next', true) : ''}</nav>`;
  }
  function shell() {
    const home = auth.dashboardPath(user.role),
      nav = [
        [home, 'Overview', '⌂'],
        ['assignments.html', 'Coursework', '▤'],
        ['events.html', 'Campus events', '▦'],
      ];
    if (user.role === 'student') nav.push(['my-events.html', 'My events', '▣']);
    if (staff())
      nav.push(
        ['create-assignment.html', 'Create assignment', '+'],
        ['create-event.html', 'Create event', '◇'],
      );
    if (user.role === 'admin') nav.push(['admin-dashboard.html?view=users', 'Manage users', '♙']);
    nav.push(['profile.html', 'My profile', '◉']);
    const active = (href) =>
      href.includes('?')
        ? page === 'admin-dashboard' && params.get('view') === 'users'
        : page === 'admin-dashboard' && params.get('view') === 'users'
          ? false
          : href === `${page}.html` ||
            (page === 'assignment-details' && href === 'assignments.html') ||
            (page === 'event-details' && href === 'events.html');
    const links = (list) =>
      list
        .map(
          ([href, label, icon]) =>
            `<a href="${href}" ${active(href) ? 'class="active" aria-current="page"' : ''}><span class="nav-icon" aria-hidden="true">${icon}</span><span>${label}</span></a>`,
        )
        .join('');
    $('app').innerHTML =
      `<div class="shell"><aside class="sidebar"><a class="brand" href="${home}"><span class="brand-mark" aria-hidden="true">CC</span>CampusConnect</a><nav aria-label="Main navigation">${links(nav)}</nav><div class="sidebar-foot">A little more connected.<br>One campus. Every possibility.</div></aside><div class="workspace"><header class="topbar"><a class="top-context" href="${home}">CampusConnect / ${esc(user.role)}</a><div class="profile-wrap"><a class="avatar" href="profile.html" aria-label="My profile">${esc(user.name.charAt(0).toUpperCase())}</a><div><span class="profile-name">${esc(user.name)}</span><span class="profile-role">${esc(user.role)}</span></div><button class="logout" id="logoutButton" type="button">Sign out</button></div></header><main id="main" class="content" tabindex="-1" aria-busy="true"><p role="status">Loading your campus…</p></main></div></div><nav class="bottom-nav" aria-label="Mobile navigation">${links([nav[0], nav[1], nav[2], user.role === 'student' ? ['my-events.html', 'My events', '▣'] : ['profile.html', 'Profile', '◉']])}</nav>`;
    $('logoutButton').addEventListener('click', (e) =>
      action(e.currentTarget, () => auth.logout()),
    );
  }
  function form(id, handler) {
    $(id).addEventListener('submit', async (event) => {
      event.preventDefault();
      const el = event.currentTarget,
        buttons = [...el.querySelectorAll('[type=submit]')];
      buttons.forEach((b) => (b.disabled = true));
      message('Saving…');
      try {
        await handler(el, new FormData(el));
      } catch (e) {
        message(e.message, 'error');
      } finally {
        buttons.forEach((b) => (b.disabled = false));
      }
    });
  }
  async function action(button, handler) {
    button.disabled = true;
    try {
      await handler();
    } catch (e) {
      message(e.message, 'error');
      toast(e.message);
    } finally {
      button.disabled = false;
    }
  }
  function bindDownloads() {
    document.querySelectorAll('[data-download]').forEach((b) => {
      if (b.dataset.bound) return;
      b.dataset.bound = 'true';
      b.addEventListener('click', () =>
        action(b, () => auth.download(b.dataset.download, b.dataset.filename)),
      );
    });
  }
  function assignmentRows(items) {
    return items.length
      ? `<div class="list">${items.map((a) => `<article class="list-item"><div><h3>${esc(a.title)}</h3><p>${esc(a.subject)} · Due ${esc(date(a.dueDate))}</p><div class="meta">${badge(a.status)}${a.submission ? badge(a.submission.grade !== null ? 'graded' : 'submitted') : ''}<span>${esc(a.maxMarks)} marks</span></div></div>${link(`assignment-details.html?id=${a._id}`, 'View details', true)}</article>`).join('')}</div>`
      : empty('No coursework here yet. Check back after your teacher publishes an assignment.');
  }
  async function dashboard() {
    if (user.role === 'admin' && params.get('view') === 'users') return users();
    const { stats: s, deadlines, featuredEvent: event } = await auth.request('/api/dashboard'),
      student = user.role === 'student';
    const cards = student
      ? [
          ['Pending coursework', s.pending, `${s.overdue} overdue · all unsubmitted tasks`],
          ['Submitted', s.submitted, 'Published assignments submitted'],
          ['Upcoming events', s.upcomingEvents, `${s.registeredUpcoming} upcoming registrations`],
          [
            'Completion',
            `${s.completion}%`,
            `${s.submitted} of ${s.published} published assignments`,
          ],
        ]
      : [
          ['Assignments', s.assignments, `${s.drafts} drafts · ${s.published} published`],
          ['Needs review', s.pendingReviews, `${s.submissions} total submissions`],
          [
            'Upcoming events',
            s.upcomingEvents,
            user.role === 'teacher' ? 'Events you organize' : 'Published campus events',
          ],
          user.role === 'admin'
            ? ['Campus accounts', s.users, `${s.teachers} active teachers`]
            : ['Published coursework', s.published, 'Available to campus students'],
        ];
    render(
      heading(
        student
          ? 'Your campus overview'
          : user.role === 'teacher'
            ? 'Teaching overview'
            : 'Campus administration',
        'A clear view of what is happening, and what comes next.',
        staff()
          ? link('create-assignment.html', '+ Create assignment')
          : link('assignments.html', 'Explore coursework'),
      ) +
        `<section class="welcome"><div><p class="eyebrow">Make room for what matters</p><h1>Hi, ${esc(user.name.split(' ')[0])}.</h1><p>${student ? 'Keep your coursework on track and find your next campus experience.' : 'Bring your teaching, coursework, and campus community together.'}</p></div><span class="welcome-art" aria-hidden="true">✦</span></section>${metrics(cards)}<div class="grid-two"><div><section class="panel"><div class="section-title"><h2>Upcoming deadlines</h2><a href="assignments.html">View all coursework →</a></div>${assignmentRows(deadlines)}</section><section class="panel"><h2>${student ? 'Your academic progress' : 'Ready for your next class?'}</h2>${student ? `<p class="muted">${s.submitted} of ${s.published} published assignments submitted.</p><div class="progress-track"><progress value="${s.completion}" max="100" aria-label="Assignment completion">${s.completion}%</progress></div><p class="unavailable">Attendance and transcripts are not available. Assignment completion comes from your saved submissions.</p>` : `<p class="muted">Review student work, publish coursework, or bring the campus together.</p><div class="actions">${link('assignments.html', 'Review coursework', true)}${link('create-event.html', 'Plan an event', true)}</div>`}</section></div><div><section class="panel feature"><h2>Coming up on campus</h2><div class="feature-art" aria-hidden="true">✦ ◇ ✦</div>${event ? `${badge(event.category)}<h3>${esc(event.title)}</h3><p>${esc(event.description.slice(0, 180))}</p><p>${esc(date(event.startsAt))}<br>${esc(event.location)}</p>${link(`event-details.html?id=${event._id}`, 'Explore this event')}` : empty('No upcoming campus events yet.')}</section><p class="unavailable">Campus notifications and email receipts are not available. Saved coursework and registrations remain in your account.</p></div></div>`,
    );
  }
  async function assignments() {
    const q = params.get('q') || '',
      status = params.get('status') || '',
      sort = params.get('sort') || '',
      data = await auth.request(
        `/api/assignments?${new URLSearchParams({ q, status, sort, page: params.get('page') || 1 })}`,
      );
    render(
      heading(
        'Coursework',
        staff()
          ? 'Create, publish, and review your assignments.'
          : 'Your next step starts with one task.',
        staff() ? link('create-assignment.html', '+ Create assignment') : '',
      ) +
        `<section class="panel"><form class="toolbar" id="filters"><div class="field"><label for="q">Search coursework</label><input id="q" name="q" type="search" maxlength="100" value="${esc(q)}" placeholder="Title, subject, or description"></div>${staff() ? `<div class="field"><label for="status">Publication</label><select id="status" name="status"><option value="">All assignments</option>${['draft', 'published'].map((s) => `<option ${s === status ? 'selected' : ''}>${s}</option>`).join('')}</select></div>` : ''}<div class="field"><label for="sort">Sort by</label><select id="sort" name="sort"><option value="">Deadline: soonest</option><option value="due-desc" ${sort === 'due-desc' ? 'selected' : ''}>Deadline: latest</option><option value="title" ${sort === 'title' ? 'selected' : ''}>Title</option></select></div><button type="submit">Apply filters</button><a class="btn secondary" href="assignments.html">Reset</a></form><h2>${data.total} assignment${data.total === 1 ? '' : 's'}</h2>${assignmentRows(data.assignments)}${pager(data)}</section>`,
    );
    $('filters').addEventListener('submit', (e) => {
      e.preventDefault();
      location.assign(`assignments.html?${new URLSearchParams(new FormData(e.currentTarget))}`);
    });
  }
  function receipt(s, a) {
    return `<dl class="receipt-grid"><dt>Submission ID</dt><dd>${esc(s._id)}</dd><dt>Coursework</dt><dd>${esc(a.title)}</dd><dt>Submitted</dt><dd>${esc(date(s.submittedAt))}</dd><dt>File</dt><dd>${esc(s.file.name)} · ${bytes(s.file.size)}</dd><dt>Timing</dt><dd>${badge(s.late ? 'late' : 'on-time')}</dd><dt>Grade</dt><dd>${s.grade === null ? 'Awaiting review' : `${esc(s.grade)} / ${esc(a.maxMarks)}`}</dd>${s.feedback ? `<dt>Feedback</dt><dd>${esc(s.feedback)}</dd>` : ''}</dl><button class="btn secondary" type="button" data-download="/api/submissions/${s._id}/download" data-filename="${esc(s.file.name)}">Download submitted file</button>`;
  }
  function checkFile(file) {
    if (!(file instanceof File) || !file.size) throw Error('Choose a non-empty file.');
    if (!/\.(pdf|zip|docx)$/i.test(file.name)) throw Error('Choose a PDF, ZIP or DOCX file.');
    if (file.size > 25 * 1024 * 1024) throw Error('File must not exceed 25 MB.');
  }
  async function assignmentDetails() {
    const id = params.get('id');
    if (!id) throw Error('Choose an assignment from Coursework.');
    const { assignment: a, submission: s } = await auth.request(
        `/api/assignments/${encodeURIComponent(id)}`,
      ),
      review = staff()
        ? await auth.request(`/api/assignments/${id}/submissions?page=${params.get('page') || 1}`)
        : null;
    render(
      `<div class="breadcrumb"><a href="assignments.html">Coursework</a> / ${esc(a.subject)}</div>` +
        heading(
          a.title,
          `${a.subject} · Due ${date(a.dueDate)}`,
          staff()
            ? `${link(`create-assignment.html?id=${id}`, 'Edit assignment', true)}<button class="btn danger" id="archiveAssignment" type="button">Archive</button>`
            : badge('published'),
        ) +
        `<div class="grid-two"><div><section class="panel"><div class="section-title"><h2>Assignment brief</h2>${badge(a.status)}</div><p class="prose">${esc(a.description)}</p><div class="meta"><span>${a.maxMarks} maximum marks</span><span>Updated ${esc(date(a.updatedAt))}</span></div></section>${a.requirements.length ? `<section class="panel"><h2>What to submit</h2>${a.requirements.map((r, i) => `<article class="requirement"><p class="eyebrow">Part ${i + 1}</p><h3>${esc(r.title)}</h3><p class="prose">${esc(r.description)}</p></article>`).join('')}</section>` : ''}<section class="panel"><h2>Course resources</h2>${a.resourceNotes ? `<p class="prose">${esc(a.resourceNotes)}</p>` : ''}${a.resources.length ? a.resources.map((r) => `<div class="resource"><span>${esc(r.name)}<br><small>${bytes(r.size)}</small></span><div class="actions"><button type="button" class="btn secondary small" data-download="/api/assignments/${id}/resources/${r.id}/download" data-filename="${esc(r.name)}">Download</button>${staff() ? `<button class="btn danger small" type="button" data-remove-resource="${r.id}">Remove</button>` : ''}</div></div>`).join('') : empty('No resources attached.')}${staff() ? `<form id="resourceForm"><div class="field"><label for="resourceFile">Attach a resource</label><input id="resourceFile" name="file" type="file" accept=".pdf,.zip,.docx" required><small>PDF, ZIP or DOCX · 25 MB maximum per file · 10 resources.</small></div><button type="submit">Upload resource</button></form>` : ''}</section></div><aside><section class="panel"><h2>${staff() ? 'Publication' : s ? 'Your submission' : 'Ready to submit?'}</h2>${staff() ? `<p class="muted">${a.status === 'draft' ? 'This draft is visible only to you and administrators.' : 'This assignment is available to all campus students.'}</p><button class="btn" id="togglePublish" type="button">${a.status === 'draft' ? 'Publish assignment' : 'Return to draft'}</button>` : s ? receipt(s, a) : `<p class="muted">Upload your completed work. Your receipt stays in your account.</p><form id="submissionForm"><div class="field file-input"><label for="submissionFile">Choose your submission</label><input id="submissionFile" name="file" type="file" accept=".pdf,.zip,.docx" required><p>PDF, ZIP or DOCX · 25 MB maximum. One final submission per assignment. Late work is accepted and marked late.</p></div><button type="submit">Submit assignment</button></form>`}</section><p class="unavailable">Files are private. Downloads require permission. Receipts confirm a saved record; they are not emailed.</p></aside></div>${review ? `<section class="panel"><div class="section-title"><h2>Student submissions</h2><span class="muted">${review.total} received</span></div>${review.submissions.length ? `<div class="table-wrap"><table><thead><tr><th>Student / file</th><th>Submitted</th><th>Grade & feedback</th></tr></thead><tbody>${review.submissions.map((s) => `<tr><td><strong>${esc(s.student?.name || 'Student')}</strong><small>${esc(s.student?.email)}</small><br><button class="btn-link" type="button" data-download="/api/submissions/${s._id}/download" data-filename="${esc(s.file.name)}">${esc(s.file.name)}</button></td><td>${esc(date(s.submittedAt))}<br>${badge(s.late ? 'late' : 'on-time')}</td><td><form class="grade-form" data-grade="${s._id}"><div class="field"><label for="grade-${s._id}">Grade / ${a.maxMarks}</label><input id="grade-${s._id}" name="grade" type="number" min="0" max="${a.maxMarks}" step="0.5" value="${s.grade ?? ''}" required></div><div class="field"><label for="feedback-${s._id}">Feedback</label><input id="feedback-${s._id}" name="feedback" maxlength="2000" value="${esc(s.feedback)}"></div><button type="submit">Save grade</button></form></td></tr>`).join('')}</tbody></table></div>${pager(review)}` : empty('No submissions yet.')}</section>` : ''}`,
    );
    bindDownloads();
    if (staff()) {
      $('archiveAssignment').addEventListener('click', (e) => {
        if (confirm('Archive this assignment? Submission records are retained.'))
          action(e.currentTarget, async () => {
            await auth.request(`/api/assignments/${id}`, { method: 'DELETE' });
            location.assign('assignments.html');
          });
      });
      $('togglePublish').addEventListener('click', (e) =>
        action(e.currentTarget, async () => {
          await auth.request(`/api/assignments/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ status: a.status === 'draft' ? 'published' : 'draft' }),
          });
          await assignmentDetails();
          toast('Publication updated');
        }),
      );
      form('resourceForm', async (el, data) => {
        checkFile(data.get('file'));
        await auth.request(`/api/assignments/${id}/resources`, { method: 'POST', body: data });
        await assignmentDetails();
        toast('Resource uploaded');
      });
      document.querySelectorAll('[data-remove-resource]').forEach((b) =>
        b.addEventListener('click', () => {
          if (confirm('Remove this resource?'))
            action(b, async () => {
              await auth.request(`/api/assignments/${id}/resources/${b.dataset.removeResource}`, {
                method: 'DELETE',
              });
              await assignmentDetails();
            });
        }),
      );
      document.querySelectorAll('[data-grade]').forEach((el) =>
        el.addEventListener('submit', (e) => {
          e.preventDefault();
          action(el.querySelector('button'), async () => {
            const data = new FormData(el);
            await auth.request(`/api/submissions/${el.dataset.grade}/grade`, {
              method: 'PUT',
              body: JSON.stringify({
                grade: Number(data.get('grade')),
                feedback: data.get('feedback'),
              }),
            });
            toast('Grade and feedback saved');
          });
        }),
      );
    } else if (!s)
      form('submissionForm', async (el, data) => {
        checkFile(data.get('file'));
        const saved = await auth.request(`/api/assignments/${id}/submissions`, {
          method: 'POST',
          body: data,
        });
        await assignmentDetails();
        $('receiptContent').innerHTML =
          `<span class="success-icon" aria-hidden="true">✓</span><h2 id="receiptTitle">Submission saved</h2><p class="muted">Your work has been saved and timestamped.</p>${receipt(saved.submission, a)}`;
        bindDownloads();
        $('receiptDialog').showModal();
      });
  }
  function requirementRow(r = {}) {
    const id = crypto.randomUUID(),
      el = document.createElement('section');
    el.className = 'requirement';
    el.innerHTML = `<div class="section-title"><h3>Requirement</h3><button class="btn-link" type="button">Remove</button></div><div class="field"><label for="rt-${id}">Requirement title</label><input id="rt-${id}" class="requirement-title" maxlength="120" value="${esc(r.title)}" required></div><div class="field"><label for="rd-${id}">Requirement description</label><textarea id="rd-${id}" class="requirement-description" maxlength="1000" rows="3" required>${esc(r.description)}</textarea></div>`;
    el.querySelector('button').addEventListener('click', () => el.remove());
    $('requirements').append(el);
  }
  async function assignmentForm() {
    const id = params.get('id'),
      a = id ? (await auth.request(`/api/assignments/${encodeURIComponent(id)}`)).assignment : {};
    render(
      heading(
        id ? 'Edit assignment' : 'Create assignment',
        'A thoughtful brief makes room for better work.',
        link('assignments.html', 'Back to coursework', true),
      ) +
        `<section class="panel form-panel"><form id="assignmentForm"><div class="form-grid"><div class="field full"><label for="title">Assignment title</label><input id="title" name="title" maxlength="150" value="${esc(a.title)}" required></div><div class="field"><label for="subject">Subject</label><input id="subject" name="subject" maxlength="100" value="${esc(a.subject)}" required></div><div class="field"><label for="maxMarks">Maximum marks</label><input id="maxMarks" name="maxMarks" type="number" min="1" max="1000" value="${a.maxMarks || 100}" required></div><div class="field"><label for="dueDate">Deadline (your local time)</label><input id="dueDate" name="dueDate" type="datetime-local" value="${localDate(a.dueDate)}" required><small>New or changed deadlines must be in the future.</small></div><div class="field"><label for="status">Publication</label><select id="status" name="status"><option value="draft">Save draft</option><option value="published" ${a.status === 'published' ? 'selected' : ''}>Publish to students</option></select></div><div class="field full"><label for="description">Assignment brief</label><textarea id="description" name="description" rows="6" maxlength="5000" required>${esc(a.description)}</textarea></div></div><div class="section-title"><h2>Requirements</h2><button class="btn secondary small" id="addRequirement" type="button">+ Add requirement</button></div><div id="requirements"></div><div class="field"><label for="resourceNotes">Resource notes (optional)</label><textarea id="resourceNotes" name="resourceNotes" rows="3" maxlength="2000">${esc(a.resourceNotes)}</textarea><small>Attach resource files from the assignment details page after saving.</small></div><div class="actions"><button type="submit">${id ? 'Save changes' : 'Save assignment'}</button>${link(id ? `assignment-details.html?id=${id}` : 'assignments.html', 'Cancel', true)}</div></form></section>`,
    );
    (a.requirements || []).forEach(requirementRow);
    $('addRequirement').addEventListener('click', () => {
      if ($('requirements').children.length >= 10) return toast('Use at most 10 requirements.');
      requirementRow();
      $('requirements').lastElementChild.querySelector('input').focus();
    });
    form('assignmentForm', async (el, data) => {
      const payload = Object.fromEntries(data);
      payload.maxMarks = Number(payload.maxMarks);
      payload.dueDate = new Date(payload.dueDate).toISOString();
      if (id && payload.dueDate.slice(0, 16) === a.dueDate.slice(0, 16)) delete payload.dueDate;
      payload.requirements = [...document.querySelectorAll('#requirements .requirement')].map(
        (row) => ({
          title: row.querySelector('input').value.trim(),
          description: row.querySelector('textarea').value.trim(),
        }),
      );
      const saved = await auth.request(id ? `/api/assignments/${id}` : '/api/assignments', {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      location.assign(`assignment-details.html?id=${saved.assignment._id}`);
    });
  }
  const icon = (category) =>
    ({ Technology: '⌘', Workshop: '◇', Cultural: '✦', Sports: '◉', Other: '✧' })[category] || '✦';
  function eventCard(e, mine = false) {
    const past = new Date(e.startsAt) <= new Date();
    return `<article class="panel event-card"><div class="feature-art" aria-hidden="true">${icon(e.category)}</div>${badge(e.status)}<h2>${esc(e.title)}</h2><small>${esc(e.category)} · ${esc(date(e.startsAt))}</small><p>${esc(e.description.slice(0, 150))}${e.description.length > 150 ? '…' : ''}</p><small>${esc(e.location)}<br>${e.registrationCount} / ${e.capacity} places booked</small><div class="actions">${link(`event-details.html?id=${e._id}`, 'View event', true)}${mine ? `<button class="btn danger small" type="button" data-cancel="${e._id}" ${past && e.status !== 'cancelled' ? 'disabled' : ''}>Cancel registration</button>` : user.role === 'student' ? `<button class="btn small" type="button" data-register="${e._id}" ${e.registered || past || e.status !== 'published' || e.registrationCount >= e.capacity ? 'disabled' : ''}>${e.registered ? 'Registered ✓' : past ? 'Registration closed' : e.registrationCount >= e.capacity ? 'Full' : 'Register'}</button>` : ''}</div></article>`;
  }
  function bindRegistration(refresh) {
    document.querySelectorAll('[data-register]').forEach((b) =>
      b.addEventListener('click', () =>
        action(b, async () => {
          await auth.request(`/api/events/${b.dataset.register}/register`, { method: 'POST' });
          await refresh();
          toast('Registration saved. Find it in My events.');
        }),
      ),
    );
    document.querySelectorAll('[data-cancel]').forEach((b) =>
      b.addEventListener('click', () => {
        if (confirm('Cancel your registration for this event?'))
          action(b, async () => {
            await auth.request(`/api/events/${b.dataset.cancel}/register`, { method: 'DELETE' });
            await refresh();
            toast('Registration cancelled');
          });
      }),
    );
  }
  async function events() {
    const q = params.get('q') || '',
      category = params.get('category') || '',
      upcoming = params.get('upcoming') || '',
      own = params.get('own') || '',
      data = await auth.request(
        `/api/events?${new URLSearchParams({ q, category, upcoming, own, page: params.get('page') || 1 })}`,
      );
    render(
      heading(
        'Find your next campus moment',
        'Discover workshops, meet your community, and make something happen.',
        staff()
          ? link('create-event.html', '+ Create event')
          : link('my-events.html', 'My registrations', true),
      ) +
        `<section class="panel"><form id="eventFilters" class="toolbar"><div class="field"><label for="q">Search events</label><input id="q" name="q" type="search" maxlength="100" value="${esc(q)}" placeholder="Title, location, or description"></div><div class="field"><label for="category">Category</label><select id="category" name="category"><option value="">All categories</option>${['Technology', 'Workshop', 'Cultural', 'Sports', 'Other'].map((c) => `<option ${category === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div><div class="field"><label for="upcoming">When</label><select id="upcoming" name="upcoming"><option value="">All events</option><option value="true" ${upcoming === 'true' ? 'selected' : ''}>Upcoming published events</option></select></div>${staff() ? `<div class="field"><label for="own">Organizer</label><select id="own" name="own"><option value="">Campus events</option><option value="true" ${own === 'true' ? 'selected' : ''}>Organized by me</option></select></div>` : ''}<button type="submit">Apply filters</button><a class="btn secondary" href="events.html">Reset</a></form><p class="muted">${data.total} event${data.total === 1 ? '' : 's'} to explore</p></section>${data.events.length ? `<div class="cards">${data.events.map((e) => eventCard(e)).join('')}</div>${pager(data)}` : empty('No events match these filters.')}`,
    );
    $('eventFilters').addEventListener('submit', (e) => {
      e.preventDefault();
      location.assign(`events.html?${new URLSearchParams(new FormData(e.currentTarget))}`);
    });
    bindRegistration(events);
  }
  async function myEvents() {
    const data = await auth.request(`/api/events/mine?page=${params.get('page') || 1}`),
      events = data.registrations.map((r) => r.event).filter(Boolean);
    render(
      heading(
        'Your campus calendar',
        'The moments you have made room for.',
        link('events.html', 'Explore events', true),
      ) +
        `<p class="muted">${data.total} registration${data.total === 1 ? '' : 's'}. Cancellation closes when an event starts; cancelled events can always be removed.</p>${events.length ? `<div class="cards">${events.map((e) => eventCard(e, true)).join('')}</div>${pager(data)}` : empty('No registrations yet. Explore campus events to get started.')}`,
    );
    bindRegistration(myEvents);
  }
  async function eventDetails() {
    const id = params.get('id');
    if (!id) throw Error('Choose an event from Campus events.');
    const { event: e } = await auth.request(`/api/events/${encodeURIComponent(id)}`),
      manage = staff() && owner(e),
      attendees = manage
        ? await auth.request(`/api/events/${id}/registrations?page=${params.get('page') || 1}`)
        : null;
    render(
      `<div class="breadcrumb"><a href="events.html">Campus events</a> / ${esc(e.category)}</div>` +
        heading(
          e.title,
          e.location,
          manage && e.status !== 'cancelled'
            ? `${link(`create-event.html?id=${id}`, 'Edit event', true)}<button id="cancelEvent" class="btn danger" type="button">Cancel event</button>`
            : badge(e.status),
        ) +
        `<div class="grid-two"><section class="panel"><div class="feature-art" aria-hidden="true">${icon(e.category)} ◇ ✦</div><p class="eyebrow">${esc(e.category)}</p><h2>About this event</h2><p class="prose">${esc(e.description)}</p></section><aside><section class="panel"><h2>A place for you</h2><dl class="receipt-grid"><dt>Starts</dt><dd>${esc(date(e.startsAt))}</dd><dt>Ends</dt><dd>${esc(date(e.endsAt))}</dd><dt>Location</dt><dd>${esc(e.location)}</dd><dt>Capacity</dt><dd>${e.registrationCount} / ${e.capacity} booked</dd><dt>Status</dt><dd>${badge(e.status)}</dd></dl>${user.role === 'student' ? (e.registered ? `<p class="status success">You are registered for this event.</p><button type="button" class="btn danger" data-cancel="${id}" ${new Date(e.startsAt) <= new Date() && e.status !== 'cancelled' ? 'disabled' : ''}>Cancel registration</button>` : `<button class="btn" type="button" data-register="${id}" ${e.status !== 'published' || new Date(e.startsAt) <= new Date() || e.registrationCount >= e.capacity ? 'disabled' : ''}>${e.registrationCount >= e.capacity ? 'Event full' : e.status !== 'published' || new Date(e.startsAt) <= new Date() ? 'Registration unavailable' : 'Register for event'}</button>`) : '<p class="muted">Student accounts can register for campus events.</p>'}</section><p class="unavailable">Registrations are saved to your account. Confirmation emails are not sent.</p></aside></div>${attendees ? `<section class="panel"><h2>Registered students · ${attendees.total}</h2>${attendees.registrations.length ? `<div class="table-wrap"><table><thead><tr><th>Student</th><th>Email</th><th>Registered</th></tr></thead><tbody>${attendees.registrations.map((r) => `<tr><td>${esc(r.student?.name || 'Student')}</td><td>${esc(r.student?.email)}</td><td>${esc(date(r.createdAt))}</td></tr>`).join('')}</tbody></table></div>${pager(attendees)}` : empty('No registrations yet.')}</section>` : ''}`,
    );
    bindRegistration(eventDetails);
    if ($('cancelEvent'))
      $('cancelEvent').addEventListener('click', (e) => {
        if (confirm('Cancel this event? Existing registrations will show it as cancelled.'))
          action(e.currentTarget, async () => {
            await auth.request(`/api/events/${id}`, {
              method: 'PUT',
              body: JSON.stringify({ status: 'cancelled' }),
            });
            await eventDetails();
          });
      });
  }
  async function eventForm() {
    const id = params.get('id'),
      e = id ? (await auth.request(`/api/events/${encodeURIComponent(id)}`)).event : {};
    if (id && (!owner(e) || e.status === 'cancelled')) throw Error('This event cannot be edited.');
    render(
      heading(
        id ? 'Edit your campus event' : 'Bring the campus together',
        'Plan the details. Make the connection.',
        link('events.html', 'Back to events', true),
      ) +
        `<section class="panel form-panel"><form id="eventForm"><div class="form-grid"><div class="field full"><label for="title">Event title</label><input id="title" name="title" maxlength="150" value="${esc(e.title)}" required></div><div class="field"><label for="category">Category</label><select name="category" id="category">${['Technology', 'Workshop', 'Cultural', 'Sports', 'Other'].map((c) => `<option ${e.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div><div class="field"><label for="location">Location</label><input id="location" name="location" maxlength="200" value="${esc(e.location)}" required></div><div class="field"><label for="startsAt">Starts (your local time)</label><input id="startsAt" name="startsAt" type="datetime-local" value="${localDate(e.startsAt)}" required></div><div class="field"><label for="endsAt">Ends (your local time)</label><input id="endsAt" name="endsAt" type="datetime-local" value="${localDate(e.endsAt)}" required></div><div class="field"><label for="capacity">Capacity</label><input id="capacity" name="capacity" type="number" min="${e.registrationCount || 1}" max="100000" value="${e.capacity || 100}" required></div><div class="field"><label for="status">Publication</label><select name="status" id="status"><option value="draft">Save draft</option><option value="published" ${e.status === 'published' ? 'selected' : ''}>Publish event</option></select></div><div class="field full"><label for="description">About the event</label><textarea id="description" name="description" rows="7" maxlength="5000" required>${esc(e.description)}</textarea></div></div><div class="actions"><button type="submit">${id ? 'Save changes' : 'Save event'}</button>${link('events.html', 'Cancel', true)}</div></form></section>`,
    );
    form('eventForm', async (el, data) => {
      const b = Object.fromEntries(data);
      b.capacity = Number(b.capacity);
      b.startsAt = new Date(b.startsAt).toISOString();
      b.endsAt = new Date(b.endsAt).toISOString();
      if (b.endsAt <= b.startsAt) throw Error('Event must end after it starts.');
      if (id)
        for (const k of ['startsAt', 'endsAt'])
          if (b[k].slice(0, 16) === e[k].slice(0, 16)) delete b[k];
      const saved = await auth.request(id ? `/api/events/${id}` : '/api/events', {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(b),
      });
      location.assign(`event-details.html?id=${saved.event._id}`);
    });
  }
  async function users() {
    const q = params.get('q') || '',
      role = params.get('role') || '',
      data = await auth.request(
        `/api/users?${new URLSearchParams({ q, role, page: params.get('page') || 1 })}`,
      );
    render(
      heading(
        'A campus built by people',
        'Manage access and help teachers get started.',
        link('admin-dashboard.html', 'Back to overview', true),
      ) +
        `<section class="panel"><form id="userFilters" class="toolbar"><input type="hidden" name="view" value="users"><div class="field"><label for="q">Search people</label><input id="q" name="q" type="search" maxlength="100" value="${esc(q)}"></div><div class="field"><label for="role">Role</label><select id="role" name="role"><option value="">All roles</option>${['student', 'teacher', 'admin'].map((r) => `<option ${r === role ? 'selected' : ''}>${r}</option>`).join('')}</select></div><button type="submit">Apply filters</button></form><h2>${data.total} campus accounts</h2>${data.users.length ? `<div class="table-wrap"><table><thead><tr><th>Person</th><th>Role</th><th>Access</th><th>Manage</th></tr></thead><tbody>${data.users.map((u) => `<tr><td><strong>${esc(u.name)}</strong><small>${esc(u.email)}</small></td><td>${badge(u.role)}</td><td>${badge(u.status)}</td><td>${u.role === 'admin' ? '<small>Protected administrator</small>' : `<div class="actions"><button class="btn secondary small" type="button" data-user="${u.id}" data-status="${u.status === 'active' ? 'disabled' : 'active'}">${u.status === 'active' ? 'Disable' : 'Enable'} access</button>${u.role === 'student' ? `<button class="btn secondary small" data-promote="${u.id}" type="button">Make teacher</button>` : ''}</div>`}</td></tr>`).join('')}</tbody></table></div>${pager(data)}` : empty('No matching accounts.')}</section><section class="panel form-panel"><h2>Create a campus account</h2><p class="muted">Share the temporary password privately. The account holder can change it from My profile.</p><form id="userForm"><div class="form-grid"><div class="field"><label for="newName">Full name</label><input id="newName" name="name" minlength="2" maxlength="100" required autocomplete="off"></div><div class="field"><label for="newEmail">Email</label><input id="newEmail" name="email" type="email" maxlength="254" required autocomplete="off"></div><div class="field"><label for="newPassword">Temporary password</label><input id="newPassword" name="password" type="password" minlength="8" required autocomplete="new-password"><small>8 characters minimum, 72 UTF-8 bytes maximum.</small></div><div class="field"><label for="newRole">Account role</label><select id="newRole" name="role"><option value="teacher">Teacher</option><option value="student">Student</option></select></div></div><button type="submit">Create account</button></form></section>`,
    );
    $('userFilters').addEventListener('submit', (e) => {
      e.preventDefault();
      location.assign(`admin-dashboard.html?${new URLSearchParams(new FormData(e.currentTarget))}`);
    });
    form('userForm', async (el, data) => {
      await auth.request('/api/users', {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(data)),
      });
      await users();
      toast('Account created. Share its temporary password privately.');
    });
    document.querySelectorAll('[data-user]').forEach((b) =>
      b.addEventListener('click', () => {
        if (confirm('Change account access? Existing sessions will end.'))
          action(b, async () => {
            await auth.request(`/api/users/${b.dataset.user}`, {
              method: 'PATCH',
              body: JSON.stringify({ status: b.dataset.status }),
            });
            await users();
            toast('Access updated');
          });
      }),
    );
    document.querySelectorAll('[data-promote]').forEach((b) =>
      b.addEventListener('click', () => {
        if (confirm('Promote this student to teacher and grant management permissions?'))
          action(b, async () => {
            await auth.request(`/api/users/${b.dataset.promote}`, {
              method: 'PATCH',
              body: JSON.stringify({ role: 'teacher' }),
            });
            await users();
            toast('Teacher access granted');
          });
      }),
    );
  }
  async function profile() {
    render(
      heading('Your place on campus', 'Keep your details up to date and your account secure.') +
        `<div class="grid-two"><section class="panel"><h2>Profile details</h2><p class="muted">${esc(user.email)} · ${esc(user.role)}</p><form id="profileForm"><div class="field"><label for="name">Full name</label><input id="name" name="name" minlength="2" maxlength="100" value="${esc(user.name)}" autocomplete="name" required></div><button type="submit">Save profile</button></form></section><section class="panel"><h2>Change your password</h2><form id="passwordForm"><div class="field"><label for="currentPassword">Current password</label><input id="currentPassword" name="currentPassword" type="password" autocomplete="current-password" required></div><div class="field"><label for="newPassword">New password</label><input id="newPassword" name="newPassword" type="password" minlength="8" autocomplete="new-password" required><small>At least 8 characters and at most 72 UTF-8 bytes. This signs out every existing session.</small></div><div class="field"><label for="confirmPassword">Confirm new password</label><input id="confirmPassword" name="confirmPassword" type="password" minlength="8" autocomplete="new-password" required></div><button type="submit">Change password</button></form></section></div>`,
    );
    form('profileForm', async (el, data) => {
      const saved = await auth.request('/api/auth/me', {
        method: 'PATCH',
        body: JSON.stringify(Object.fromEntries(data)),
      });
      user = saved.user;
      shell();
      await profile();
      message('Profile updated', 'success');
    });
    form('passwordForm', async (el, data) => {
      if (data.get('newPassword') !== data.get('confirmPassword'))
        throw Error('New passwords do not match.');
      await auth.request('/api/auth/password', {
        method: 'PUT',
        body: JSON.stringify({
          currentPassword: data.get('currentPassword'),
          newPassword: data.get('newPassword'),
        }),
      });
      auth.clearSession();
      location.assign('login.html?expired=1');
    });
  }
  const routes = {
    dashboard,
    'teacher-dashboard': dashboard,
    'admin-dashboard': dashboard,
    assignments,
    'assignment-details': assignmentDetails,
    'create-assignment': assignmentForm,
    events,
    'my-events': myEvents,
    'event-details': eventDetails,
    'create-event': eventForm,
    profile,
  };
  async function start() {
    try {
      const required =
        page === 'dashboard' || page === 'my-events'
          ? 'student'
          : page === 'teacher-dashboard'
            ? 'teacher'
            : page === 'admin-dashboard'
              ? 'admin'
              : page.startsWith('create-')
                ? ['teacher', 'admin']
                : null;
      user = await auth.requireRole(required);
      if (!user) return;
      shell();
      await routes[page]();
    } catch (e) {
      if (!$('main')) return;
      render(
        heading('We could not load this page', 'Your saved records are safe.') +
          `<section class="panel"><p class="status error" role="alert">${esc(e.message)}</p><div class="actions"><button id="retry" class="btn" type="button">Try again</button>${link(user ? auth.dashboardPath(user.role) : 'login.html', user ? 'Back to overview' : 'Return to sign in', true)}</div></section>`,
      );
      $('retry').addEventListener('click', () => location.reload());
    }
  }
  $('closeReceipt').addEventListener('click', () => $('receiptDialog').close());
  start();
})();
