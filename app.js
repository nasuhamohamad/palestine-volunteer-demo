/* Palestine Volunteer Signup Platform — in-browser demo.
 * Mirrors the real app's screens and rules (capacity, deadlines, roles, emails)
 * using sample data kept in localStorage. No server, no real accounts. */
(() => {
  "use strict";

  const KEY = "pv-demo-v1";
  const TSHIRT = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];
  const GENDERS = ["Male", "Female"];
  const ROLE_LABEL = { volunteer: "Volunteer", coordinator: "Event Coordinator", super_admin: "Super Admin" };

  // ---------------------------------------------------------------- utils

  const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ESC[c]);
  const uid = () =>
    globalThis.crypto?.randomUUID?.() ?? "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur" }).format(new Date());
  const addDays = (iso, n) => {
    const d = new Date(iso + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const dateFmt = new Intl.DateTimeFormat("en-MY", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  const fmtDate = (d) => (d ? dateFmt.format(new Date(d.length === 10 ? d + "T00:00:00Z" : d)) : "");
  const to12h = (t) => {
    const [h, m] = t.split(":").map(Number);
    const s = h < 12 ? "AM" : "PM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return m === 0 ? `${h12}${s}` : `${h12}:${String(m).padStart(2, "0")}${s}`;
  };
  const fmtSlot = (a, b) => (a && b ? `${to12h(a)} – ${to12h(b)}` : "Full Day");
  const cap = (s) => s[0].toUpperCase() + s.slice(1);

  // ---------------------------------------------------------------- data

  function seed() {
    const t = today();
    const u = (name, email, role) => ({ id: uid(), name, email, role, created_at: new Date().toISOString() });
    const admin = u("Nur Aisyah", "admin@demo.org", "super_admin");
    const coord = u("Hafiz Rahman", "hafiz@demo.org", "coordinator");
    const vols = [
      ["Ahmad Zaki", "ahmad@demo.org", 24, "Male", "L", "First aid, crowd control"],
      ["Sarah Lim", "sarah@demo.org", 29, "Female", "M", "Cooking, food handling"],
      ["Ali Hassan", "ali@demo.org", 21, "Male", "XL", "Driving, logistics"],
      ["Fatimah Yusof", "fatimah@demo.org", 33, "Female", "S", "Event management"],
      ["Johan Tan", "johan@demo.org", 26, "Male", "M", "Photography, social media"],
      ["Mei Ling", "mei@demo.org", 22, "Female", "S", "Customer service"],
    ].map(([name, email, age, gender, size, skills]) => ({ user: u(name, email, "volunteer"), age, gender, size, skills }));
    const newbie = u("Aminah (new volunteer)", "aminah@demo.org", "volunteer");

    const profiles = vols.map((v, i) => ({
      user_id: v.user.id,
      age: v.age,
      gender: v.gender,
      phone: `01${i + 2}-345 67${i}${i}`,
      emergency_contact: `Family contact – 019-876 54${i}${i}`,
      tshirt_size: v.size,
      skills: v.skills,
      organization: i % 2 ? "Muslim Youth Network" : "",
    }));

    const ev = (title, description, location, eventIn, deadlineIn, status = "open") => ({
      id: uid(),
      title,
      description,
      location,
      event_date: addDays(t, eventIn),
      registration_deadline: addDays(t, deadlineIn),
      status,
      created_by: coord.id,
    });
    const run = ev(
      "Palestine Charity Run",
      "Annual 5km and 10km charity run. All proceeds go to medical aid for Gaza. We need volunteers for registration, food, crowd control and logistics.",
      "Putrajaya",
      57,
      52,
    );
    const packing = ev(
      "Aid Packing Drive",
      "Pack food and hygiene kits for families in need. Suitable for all ages; training provided on the day.",
      "Shah Alam",
      92,
      87,
    );
    const iftar = ev(
      "Solidarity Dinner & Talk",
      "An evening of solidarity with speakers and dinner. Registration has closed.",
      "Kuala Lumpur",
      21,
      14,
      "closed",
    );
    const task = (event, task_name, slot_start, slot_end, capacity) => ({
      id: uid(),
      event_id: event.id,
      task_name,
      slot_start,
      slot_end,
      capacity,
    });
    const tasks = [
      task(run, "Registration Counter", "07:00", "10:00", 3),
      task(run, "Food Booth", "08:00", "12:00", 5),
      task(run, "Crowd Control", "07:00", "13:00", 4),
      task(run, "Logistics", null, null, 6),
      task(packing, "Packing Line", "09:00", "13:00", 20),
      task(packing, "Quality Check", "09:00", "13:00", 4),
      task(packing, "Loading & Transport", "13:00", "17:00", 6),
      task(iftar, "Ushers", "18:00", "22:00", 6),
    ];
    const [reg, food, crowd, , packLine] = tasks;
    const r = (user, task, status, daysAgo) => ({
      id: uid(),
      user_id: user.id,
      task_id: task.id,
      status,
      applied_at: new Date(Date.now() - daysAgo * 864e5).toISOString(),
    });
    // FR-07 example: Food Booth (capacity 5) is full with Ahmad, Sarah, Ali, Fatimah, Johan.
    const registrations = [
      r(vols[0].user, food, "approved", 6),
      r(vols[1].user, food, "approved", 6),
      r(vols[2].user, food, "pending", 5),
      r(vols[3].user, food, "pending", 4),
      r(vols[4].user, food, "pending", 3),
      r(vols[5].user, reg, "pending", 2),
      r(vols[0].user, packLine, "pending", 1),
      r(vols[1].user, crowd, "rejected", 5),
    ];

    return {
      users: [admin, coord, ...vols.map((v) => v.user), newbie],
      profiles,
      events: [run, packing, iftar],
      tasks,
      registrations,
      outbox: [],
      session: null,
    };
  }

  function load() {
    try {
      const s = localStorage.getItem(KEY);
      if (s) return JSON.parse(s);
    } catch {}
    return seed();
  }
  let db = load();
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
    } catch {}
  }

  // ---------------------------------------------------------------- queries

  const me = () => db.users.find((u) => u.id === db.session) ?? null;
  const isStaff = (u) => u?.role === "super_admin" || u?.role === "coordinator";
  const canManage = (u, ev) => u?.role === "super_admin" || (u?.role === "coordinator" && ev.created_by === u.id);
  const profileOf = (id) => db.profiles.find((p) => p.user_id === id) ?? null;
  const eventById = (id) => db.events.find((e) => e.id === id);
  const taskById = (id) => db.tasks.find((t) => t.id === id);
  const userById = (id) => db.users.find((u) => u.id === id);
  const tasksOf = (eid) =>
    db.tasks
      .filter((t) => t.event_id === eid)
      .sort((a, b) => (a.slot_start ?? "99").localeCompare(b.slot_start ?? "99") || a.task_name.localeCompare(b.task_name));
  const active = (r) => r.status === "pending" || r.status === "approved";
  const takenOf = (tid, exceptId) => db.registrations.filter((r) => r.task_id === tid && active(r) && r.id !== exceptId).length;
  const regOpen = (ev) => ev.status === "open" && today() <= ev.registration_deadline;
  const managedEvents = (u) =>
    db.events
      .filter((e) => u.role === "super_admin" || e.created_by === u.id)
      .sort((a, b) => b.event_date.localeCompare(a.event_date));
  const regsForEvent = (eid) => {
    const ids = new Set(tasksOf(eid).map((t) => t.id));
    return db.registrations.filter((r) => ids.has(r.task_id)).sort((a, b) => a.applied_at.localeCompare(b.applied_at));
  };
  function summary(eid) {
    const s = { total: 0, pending: 0, approved: 0, rejected: 0, capacity: 0 };
    for (const t of tasksOf(eid)) s.capacity += t.capacity;
    for (const r of regsForEvent(eid)) {
      s.total++;
      s[r.status]++;
    }
    return s;
  }

  // ---------------------------------------------------------------- email (FR-08)

  const SUBJECT = {
    submitted: "Application Received",
    approved: "Volunteer Application Approved",
    rejected: "Volunteer Application Update",
  };
  function email(reg, kind) {
    const u = userById(reg.user_id);
    const t = taskById(reg.task_id);
    const e = eventById(t.event_id);
    const body = {
      submitted: `Thank you for applying to volunteer. Your application is pending review by the event coordinator. We will email you once it has been reviewed.`,
      approved: `Great news — your volunteer application has been approved. We look forward to seeing you!`,
      rejected: `Thank you for your interest. Unfortunately we are unable to accept your application for this task. You are welcome to apply for other tasks or events.`,
    }[kind];
    db.outbox.unshift({
      id: uid(),
      to: u.email,
      name: u.name,
      subject: SUBJECT[kind],
      body,
      details: { event: e.title, task: t.task_name, slot: fmtSlot(t.slot_start, t.slot_end), date: fmtDate(e.event_date), location: e.location },
      at: new Date().toISOString(),
    });
  }

  // ---------------------------------------------------------------- actions

  class Fail extends Error {}
  const need = (cond, msg) => {
    if (!cond) throw new Fail(msg);
  };
  const str = (fd, k) => String(fd.get(k) ?? "").trim();

  const actions = {
    reset() {
      db = seed();
      save();
      go("#/");
      return "Demo reset to sample data.";
    },
    login(_, el) {
      db.session = el.dataset.id;
      const u = me();
      go(isStaff(u) ? "#/admin" : "#/dashboard");
      return `Logged in as ${u.name} (${ROLE_LABEL[u.role]}).`;
    },
    logout() {
      db.session = null;
      go("#/");
      return "Logged out.";
    },
    apply(_, el) {
      const u = me();
      need(u, "Please log in first.");
      const t = taskById(el.dataset.id);
      const ev = eventById(t.event_id);
      need(profileOf(u.id), "Please complete your volunteer profile first.");
      need(ev.status === "open", "Registration for this event is closed.");
      need(today() <= ev.registration_deadline, "The registration deadline has passed.");
      need(!db.registrations.some((r) => r.user_id === u.id && r.task_id === t.id), "You have already applied for this task.");
      need(takenOf(t.id) < t.capacity, "This task is full. No additional registration allowed.");
      const reg = { id: uid(), user_id: u.id, task_id: t.id, status: "pending", applied_at: new Date().toISOString() };
      db.registrations.push(reg);
      email(reg, "submitted");
      return "Application submitted! Status: Pending. Email “Application Received” sent.";
    },
    withdraw(_, el) {
      const u = me();
      const i = db.registrations.findIndex((r) => r.id === el.dataset.id && r.user_id === u?.id && r.status === "pending");
      need(i >= 0, "Only pending applications can be withdrawn.");
      db.registrations.splice(i, 1);
      return "Application withdrawn — slot released.";
    },
    review(_, el) {
      const u = me();
      const reg = db.registrations.find((r) => r.id === el.dataset.id);
      const status = el.dataset.status;
      const t = taskById(reg.task_id);
      need(canManage(u, eventById(t.event_id)), "You don't have permission to manage this event.");
      need(reg.status !== status, `Already ${status}.`);
      if (reg.status === "rejected") need(takenOf(t.id, reg.id) < t.capacity, "This task is full. No additional registration allowed.");
      reg.status = status;
      email(reg, status);
      return `${cap(status)} — email “${SUBJECT[status]}” sent to ${userById(reg.user_id).name}.`;
    },
    setStatus(_, el) {
      const ev = eventById(el.dataset.id);
      need(canManage(me(), ev), "You don't have permission to manage this event.");
      ev.status = ev.status === "open" ? "closed" : "open";
      return ev.status === "open" ? "Registration opened." : "Registration closed.";
    },
    deleteEvent(_, el) {
      const ev = eventById(el.dataset.id);
      need(canManage(me(), ev), "You don't have permission to manage this event.");
      const tids = new Set(tasksOf(ev.id).map((t) => t.id));
      db.registrations = db.registrations.filter((r) => !tids.has(r.task_id));
      db.tasks = db.tasks.filter((t) => t.event_id !== ev.id);
      db.events = db.events.filter((e) => e.id !== ev.id);
      go("#/admin");
      return "Event deleted.";
    },
    deleteTask(_, el) {
      const t = taskById(el.dataset.id);
      need(canManage(me(), eventById(t.event_id)), "You don't have permission to manage this event.");
      db.registrations = db.registrations.filter((r) => r.task_id !== t.id);
      db.tasks = db.tasks.filter((x) => x.id !== t.id);
      return `Task “${t.task_name}” deleted.`;
    },
    editTask(_, el) {
      ui.editTask = ui.editTask === el.dataset.id ? null : el.dataset.id;
    },
    exportCsv(_, el) {
      const rows = exportRows(el.dataset.id, el.dataset.status);
      const csvCell = (v) => {
        let s = String(v);
        if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
        return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      };
      const text = "﻿" + [EXPORT_COLS.map(csvCell).join(","), ...rows.map((r) => r.map(csvCell).join(","))].join("\r\n");
      download(new Blob([text], { type: "text/csv;charset=utf-8" }), exportName(el.dataset.id, el.dataset.status, "csv"));
      return `Exported ${rows.length} row(s) to CSV.`;
    },
    async exportXlsx(_, el) {
      const rows = exportRows(el.dataset.id, el.dataset.status);
      const ExcelJS = await loadExcelJs();
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Volunteers", { views: [{ state: "frozen", ySplit: 1 }] });
      ws.addRow(EXPORT_COLS);
      rows.forEach((r) => ws.addRow(r));
      ws.columns.forEach((c, i) => (c.width = [24, 28, 16, 22, 16, 18, 6, 9, 8, 30, 32, 22, 14][i]));
      const h = ws.getRow(1);
      h.font = { bold: true, color: { argb: "FFFFFFFF" } };
      h.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF007A3D" } };
      const ev = eventById(el.dataset.id);
      const s = summary(ev.id);
      const sum = wb.addWorksheet("Summary");
      sum.addRows([
        ["Event", ev.title],
        ["Total registrations", s.total],
        ["Approved", s.approved],
        ["Pending", s.pending],
        ["Rejected", s.rejected],
      ]);
      sum.getColumn(1).width = 22;
      sum.getColumn(2).width = 40;
      const buf = await wb.xlsx.writeBuffer();
      download(
        new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        exportName(ev.id, el.dataset.status, "xlsx"),
      );
      return `Exported ${rows.length} row(s) to Excel.`;
    },
    clearOutbox() {
      db.outbox = [];
      return "Outbox cleared.";
    },
  };

  const forms = {
    register(fd) {
      const name = str(fd, "name");
      const emailAddr = str(fd, "email").toLowerCase();
      need(name.length >= 2, "Please enter your full name.");
      need(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddr), "Please enter a valid email address.");
      need(!db.users.some((u) => u.email === emailAddr), "That email is already registered in this demo.");
      const u = { id: uid(), name, email: emailAddr, role: "volunteer", created_at: new Date().toISOString() };
      db.users.push(u);
      db.session = u.id;
      go("#/profile");
      return "Account created! Now complete your volunteer profile.";
    },
    profile(fd) {
      const u = me();
      const name = str(fd, "name");
      const age = Number(str(fd, "age"));
      const p = {
        user_id: u.id,
        age,
        gender: str(fd, "gender"),
        phone: str(fd, "phone"),
        emergency_contact: str(fd, "emergency_contact"),
        tshirt_size: str(fd, "tshirt_size"),
        skills: str(fd, "skills"),
        organization: str(fd, "organization"),
      };
      need(name.length >= 2, "Full name is required.");
      need(Number.isInteger(age) && age >= 12 && age <= 100, "Age must be a whole number between 12 and 100.");
      need(GENDERS.includes(p.gender), "Please select a gender.");
      need(/^\+?[0-9\s-]{8,20}$/.test(p.phone), "Please enter a valid mobile number, e.g. 012-345 6789.");
      need(p.emergency_contact.length >= 5, "Emergency contact is required (name and phone number).");
      need(TSHIRT.includes(p.tshirt_size), "Please select a T-shirt size.");
      need(p.skills, "Please list at least one skill.");
      u.name = name;
      db.profiles = db.profiles.filter((x) => x.user_id !== u.id).concat(p);
      return "Profile saved.";
    },
    event(fd) {
      const u = me();
      need(isStaff(u), "Only coordinators can manage events.");
      const id = str(fd, "id");
      const row = {
        title: str(fd, "title"),
        description: str(fd, "description"),
        location: str(fd, "location"),
        event_date: str(fd, "event_date"),
        registration_deadline: str(fd, "registration_deadline"),
        status: str(fd, "status") === "closed" ? "closed" : "open",
      };
      need(row.title, "Event name is required.");
      need(row.location, "Location is required.");
      need(row.event_date && row.registration_deadline, "Event date and registration deadline are required.");
      need(row.registration_deadline <= row.event_date, "Registration deadline must be on or before the event date.");
      if (id) {
        const ev = eventById(id);
        need(canManage(u, ev), "You don't have permission to manage this event.");
        Object.assign(ev, row);
        return "Event saved.";
      }
      const ev = { id: uid(), ...row, created_by: u.id };
      db.events.push(ev);
      go(`#/admin/event/${ev.id}`);
      return "Event created. Now add the volunteer tasks and their slots.";
    },
    task(fd, form) {
      const u = me();
      const ev = eventById(str(fd, "event_id"));
      need(canManage(u, ev), "You don't have permission to manage this event.");
      const fullDay = fd.get("full_day") === "on";
      const row = {
        task_name: str(fd, "task_name"),
        slot_start: fullDay ? null : str(fd, "slot_start") || null,
        slot_end: fullDay ? null : str(fd, "slot_end") || null,
        capacity: Number(str(fd, "capacity")),
      };
      need(row.task_name, "Task name is required.");
      need(Number.isInteger(row.capacity) && row.capacity >= 1 && row.capacity <= 500, "Capacity must be a whole number from 1 to 500.");
      if (!fullDay) {
        need(row.slot_start && row.slot_end, "Enter a start and end time, or tick Full day.");
        need(row.slot_end > row.slot_start, "End time must be after start time.");
      }
      const id = str(fd, "id");
      if (id) {
        const t = taskById(id);
        const taken = takenOf(t.id);
        need(row.capacity >= taken, `Capacity cannot be lower than current applications (${taken}).`);
        Object.assign(t, row);
        ui.editTask = null;
        return "Task updated.";
      }
      db.tasks.push({ id: uid(), event_id: ev.id, ...row });
      form.reset();
      return `Task “${row.task_name}” added.`;
    },
    role(fd) {
      const u = me();
      need(u?.role === "super_admin", "Only a super admin can change roles.");
      const target = userById(str(fd, "user_id"));
      const role = str(fd, "role");
      need(ROLE_LABEL[role], "Invalid role.");
      need(target.id !== u.id, "You cannot change your own role.");
      target.role = role;
      return `${target.name} is now ${ROLE_LABEL[role]}.`;
    },
  };

  // ---------------------------------------------------------------- export helpers (FR-10)

  const EXPORT_COLS = [
    "Name", "Email", "Phone", "Assigned Task", "Slot", "Application Status",
    "Age", "Gender", "T-Shirt", "Emergency Contact", "Skills", "Organization", "Applied On",
  ];
  function exportRows(eid, status) {
    return regsForEvent(eid)
      .filter((r) => !status || r.status === status)
      .map((r) => {
        const u = userById(r.user_id);
        const p = profileOf(r.user_id) ?? {};
        const t = taskById(r.task_id);
        return [
          u.name, u.email, p.phone ?? "", t.task_name, fmtSlot(t.slot_start, t.slot_end), cap(r.status),
          p.age ?? "", p.gender ?? "", p.tshirt_size ?? "", p.emergency_contact ?? "", p.skills ?? "",
          p.organization ?? "", fmtDate(r.applied_at),
        ];
      });
  }
  const exportName = (eid, status, ext) => {
    const slug = eventById(eid).title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
    return `volunteers-${slug}${status ? "-" + status : ""}.${ext}`;
  };
  function download(blob, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  let excelJsPromise;
  function loadExcelJs() {
    excelJsPromise ??= new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js";
      s.crossOrigin = "anonymous";
      s.onload = () => resolve(window.ExcelJS);
      s.onerror = () => {
        excelJsPromise = undefined;
        reject(new Fail("Could not load the Excel library. Check your connection, or use CSV."));
      };
      document.head.append(s);
    });
    return excelJsPromise;
  }

  // ---------------------------------------------------------------- ui bits

  const ui = { editTask: null };

  const STATUS_STYLE = {
    pending: "bg-amber-100 text-amber-800",
    approved: "bg-brand-100 text-brand-800",
    rejected: "bg-red-100 text-red-800",
  };
  const badge = (s) =>
    `<span class="inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLE[s]}">${esc(s)}</span>`;
  const openPill = (open, long) =>
    `<span class="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${open ? "bg-brand-100 text-brand-800" : "bg-stone-200 text-stone-600"}">${
      open ? (long ? "Registration open" : "Open") : long ? "Registration closed" : "Closed"
    }</span>`;
  const btn = (action, label, attrs = "", cls = "btn btn-secondary btn-sm") =>
    `<button type="button" class="${cls}" data-action="${action}" ${attrs}>${label}</button>`;
  const stat = (label, value, hl) =>
    `<div class="card p-4 ${hl ? "border-amber-300 bg-amber-50" : ""}"><p class="text-2xl font-bold">${value}</p><p class="muted">${esc(label)}</p></div>`;
  const notice = (tone, html) => {
    const t = { green: "bg-brand-50 text-brand-800", amber: "bg-amber-50 text-amber-900", red: "bg-red-50 text-red-800" }[tone];
    return `<p class="mb-4 rounded-lg px-4 py-3 text-sm ${t}">${html}</p>`;
  };
  const field = (label, id, input, cls = "") => `<div class="${cls}"><label for="${id}" class="label">${label}</label>${input}</div>`;
  const options = (list, sel, labels) =>
    list.map((v) => `<option value="${esc(v)}" ${v === sel ? "selected" : ""}>${esc(labels ? labels[v] : v)}</option>`).join("");
  const formError = `<p data-error role="alert" class="hidden rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"></p>`;

  function eventCard(e) {
    const open = regOpen(e);
    return `<a href="#/event/${e.id}" class="card group flex flex-col gap-2 transition-shadow hover:border-brand-600 hover:shadow-md">
      <div class="flex items-start justify-between gap-3"><h3 class="font-semibold group-hover:text-brand-700">${esc(e.title)}</h3>${openPill(open)}</div>
      <p class="line-clamp-2 text-sm text-stone-600">${esc(e.description)}</p>
      <dl class="mt-auto grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 pt-2 text-sm">
        <dt class="text-stone-500">Date</dt><dd>${fmtDate(e.event_date)}</dd>
        <dt class="text-stone-500">Location</dt><dd>${esc(e.location)}</dd>
        ${open ? `<dt class="text-stone-500">Apply by</dt><dd>${fmtDate(e.registration_deadline)}</dd>` : ""}
      </dl></a>`;
  }
  const upcoming = () => db.events.filter((e) => e.event_date >= today()).sort((a, b) => a.event_date.localeCompare(b.event_date));

  function slotMeter(taken, capacity) {
    const left = Math.max(0, capacity - taken);
    const pct = Math.min(100, Math.round((taken / capacity) * 100));
    return `<div class="w-28 shrink-0 text-right"><p class="text-sm font-semibold">${left} <span class="font-normal text-stone-500">of ${capacity} left</span></p>
      <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-200"><div class="h-full ${left === 0 ? "bg-accent-600" : "bg-brand-600"}" style="width:${pct}%"></div></div></div>`;
  }

  // ---------------------------------------------------------------- views

  const views = {};

  views.home = () => `
    <div class="space-y-12">
      <section class="relative overflow-hidden rounded-2xl bg-stone-900 px-6 py-12 text-white sm:px-10 sm:py-16">
        <div aria-hidden="true" class="absolute inset-y-0 left-0 w-3 bg-accent-600 sm:w-4"></div>
        <p class="mb-3 text-sm font-semibold tracking-wide text-brand-100 uppercase">Volunteer with us</p>
        <h1 class="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">Stand with Palestine. Give your time where it counts.</h1>
        <p class="mt-4 max-w-xl text-stone-300">We organise charity runs, fundraisers, aid packing drives and solidarity events. Every one of them runs on volunteers — register once, then sign up for the tasks and time slots that suit you.</p>
        <div class="mt-8 flex flex-wrap gap-3">
          ${me() ? `<a href="#/events" class="btn btn-primary">Browse events</a>` : `<a href="#/login" class="btn btn-primary">Try the demo</a><a href="#/events" class="btn border border-stone-600 text-white hover:bg-stone-800">See upcoming events</a>`}
        </div>
      </section>
      <section class="grid gap-4 sm:grid-cols-3">
        ${[
          ["1. Register", "Create your account and complete your volunteer profile."],
          ["2. Pick a task", "Choose an event, then a task and time slot with open places."],
          ["3. Get confirmed", "A coordinator reviews your application and you'll get an email."],
        ].map(([t, d]) => `<div class="card"><h2 class="font-semibold text-brand-700">${t}</h2><p class="mt-1 text-sm text-stone-600">${d}</p></div>`).join("")}
      </section>
      <section>
        <div class="mb-4 flex items-end justify-between"><h2 class="text-xl font-bold">Upcoming events</h2><a href="#/events" class="text-sm font-semibold text-brand-700 hover:underline">View all</a></div>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">${upcoming().slice(0, 6).map(eventCard).join("") || `<p class="card muted">No upcoming events.</p>`}</div>
      </section>
    </div>`;

  views.events = () => `
    <h1 class="h1">Upcoming events</h1>
    <p class="muted mt-1 mb-6">Choose an event to see its volunteer tasks and available slots.</p>
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">${upcoming().map(eventCard).join("") || `<p class="card muted">No upcoming events right now.</p>`}</div>`;

  views.event = ([id]) => {
    const e = eventById(id);
    if (!e) return views.notFound();
    const u = me();
    const open = regOpen(e);
    const hasProfile = u && profileOf(u.id);
    const tasks = tasksOf(id);
    return `<div class="space-y-6">
      <a href="#/events" class="text-sm text-brand-700 hover:underline">← All events</a>
      <section class="card">
        <div class="flex flex-wrap items-start justify-between gap-3"><h1 class="h1">${esc(e.title)}</h1>${openPill(open, true)}</div>
        <dl class="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div><dt class="text-stone-500">Date</dt><dd class="font-medium">${fmtDate(e.event_date)}</dd></div>
          <div><dt class="text-stone-500">Location</dt><dd class="font-medium">${esc(e.location)}</dd></div>
          <div><dt class="text-stone-500">Registration deadline</dt><dd class="font-medium">${fmtDate(e.registration_deadline)}</dd></div>
        </dl>
        ${e.description ? `<p class="mt-4 whitespace-pre-line text-stone-700">${esc(e.description)}</p>` : ""}
      </section>
      <section>
        <h2 class="h2 mb-3">Volunteer tasks</h2>
        ${open && !u ? notice("green", `<a href="#/login" class="font-semibold underline">Log in</a> or <a href="#/register" class="font-semibold underline">register</a> to apply for a task.`) : ""}
        ${open && u && !hasProfile ? notice("amber", `Please <a href="#/profile" class="font-semibold underline">complete your volunteer profile</a> before applying.`) : ""}
        ${tasks.length === 0 ? `<p class="card muted">Tasks for this event haven't been published yet.</p>` : `<ul class="grid gap-3 sm:grid-cols-2">${tasks
          .map((t) => {
            const taken = takenOf(t.id);
            const mine = u && db.registrations.find((r) => r.user_id === u.id && r.task_id === t.id);
            let foot = "";
            if (mine) foot = `<p class="flex items-center gap-2 text-sm">Your application: ${badge(mine.status)}</p>`;
            else if (taken >= t.capacity) foot = `<p class="text-sm font-semibold text-accent-700">Task full — no additional registration</p>`;
            else if (open && u && hasProfile) foot = btn("apply", "Apply for this task", `data-id="${t.id}"`, "btn btn-primary btn-sm");
            return `<li class="card flex flex-col gap-3">
              <div class="flex items-start justify-between gap-3"><div><h3 class="font-semibold">${esc(t.task_name)}</h3><p class="text-sm text-stone-600">${fmtSlot(t.slot_start, t.slot_end)}</p></div>${slotMeter(taken, t.capacity)}</div>
              <div class="mt-auto">${foot}</div></li>`;
          })
          .join("")}</ul>`}
      </section></div>`;
  };

  views.login = () => {
    const group = (title, role) => {
      const us = db.users.filter((u) => u.role === role);
      return `<div><h3 class="mb-2 text-sm font-semibold text-stone-600">${title}</h3><div class="grid gap-2">${us
        .map((u) => {
          const hint = role === "volunteer" ? (profileOf(u.id) ? "Profile complete" : "No profile yet") : esc(u.email);
          return `<button type="button" data-action="login" data-id="${u.id}" class="flex items-center justify-between gap-3 rounded-lg border border-stone-200 px-3 py-2 text-left hover:border-brand-600 hover:bg-brand-50"><span class="font-medium">${esc(u.name)}</span><span class="text-xs text-stone-500">${hint}</span></button>`;
        })
        .join("")}</div></div>`;
    };
    return `<div class="mx-auto max-w-md">
      <h1 class="h1 mb-2">Log in</h1>
      <p class="muted mb-6">This is a demo, so there are no passwords. Pick an account to see the platform from that role's point of view.</p>
      <div class="card space-y-5">${group("Super Admin", "super_admin")}${group("Event Coordinator", "coordinator")}${group("Volunteers", "volunteer")}</div>
      <p class="muted mt-4 text-center">Want to start fresh? <a href="#/register" class="font-semibold text-brand-700 hover:underline">Create a demo account</a></p>
    </div>`;
  };

  views.register = () => `<div class="mx-auto max-w-sm">
    <h1 class="h1 mb-2">Become a volunteer</h1>
    <p class="muted mb-6">Create an account to apply for volunteer tasks. In this demo no password is needed and nothing leaves your browser.</p>
    <form data-form="register" class="card space-y-4" novalidate>
      ${field("Full name", "name", `<input id="name" name="name" autocomplete="name" required class="input" />`)}
      ${field("Email", "email", `<input id="email" name="email" type="email" autocomplete="email" required class="input" placeholder="you@example.org" />`)}
      ${formError}
      <button class="btn btn-primary w-full">Create account</button>
    </form>
    <p class="muted mt-4 text-center">Already registered? <a href="#/login" class="font-semibold text-brand-700 hover:underline">Log in</a></p></div>`;

  views.dashboard = () => {
    const u = me();
    const apps = db.registrations.filter((r) => r.user_id === u.id);
    const counts = { pending: 0, approved: 0, rejected: 0 };
    apps.forEach((a) => counts[a.status]++);
    const up = apps
      .filter((a) => a.status === "approved" && eventById(taskById(a.task_id).event_id).event_date >= today())
      .map((a) => ({ a, t: taskById(a.task_id), e: eventById(taskById(a.task_id).event_id) }))
      .sort((x, y) => x.e.event_date.localeCompare(y.e.event_date));
    return `<div class="space-y-6">
      <div><h1 class="h1">Welcome, ${esc(u.name.split(" ")[0])}</h1><p class="muted mt-1">${ROLE_LABEL[u.role]}</p></div>
      ${isStaff(u) ? `<div class="card flex flex-wrap items-center justify-between gap-3 border-brand-600 bg-brand-50"><p class="text-sm text-brand-800">You have coordinator access. Manage events and review applications.</p><a href="#/admin" class="btn btn-primary btn-sm">Go to Admin</a></div>` : ""}
      ${!profileOf(u.id) ? `<div class="card flex flex-wrap items-center justify-between gap-3 border-amber-300 bg-amber-50"><p class="text-sm text-amber-900">Your volunteer profile is incomplete. You need it before you can apply.</p><a href="#/profile" class="btn btn-primary btn-sm">Complete profile</a></div>` : ""}
      <div class="grid grid-cols-3 gap-3">${stat("Pending", counts.pending)}${stat("Approved", counts.approved)}${stat("Rejected", counts.rejected)}</div>
      <section><h2 class="h2 mb-3">My upcoming assignments</h2>
        ${up.length === 0 ? `<div class="card"><p class="muted">No confirmed assignments yet.</p><a href="#/events" class="btn btn-primary btn-sm mt-3">Find an event</a></div>` : `<ul class="space-y-3">${up
          .map(({ t, e }) => `<li class="card"><p class="font-semibold">${esc(e.title)}</p><p class="text-sm text-stone-700">${esc(t.task_name)} · ${fmtSlot(t.slot_start, t.slot_end)}</p><p class="muted">${fmtDate(e.event_date)} · ${esc(e.location)}</p></li>`)
          .join("")}</ul>`}
      </section></div>`;
  };

  views.applications = () => {
    const u = me();
    const apps = db.registrations.filter((r) => r.user_id === u.id).sort((a, b) => b.applied_at.localeCompare(a.applied_at));
    if (!apps.length)
      return `<h1 class="h1">My applications</h1><div class="card mt-6 text-center"><p class="muted">You haven't applied for any tasks yet.</p><a href="#/events" class="btn btn-primary mt-4">Browse events</a></div>`;
    return `<h1 class="h1">My applications</h1><p class="muted mt-1 mb-6">Track the status of every task you've applied for.</p>
      <ul class="space-y-3">${apps
        .map((a) => {
          const t = taskById(a.task_id);
          const e = eventById(t.event_id);
          return `<li class="card flex flex-wrap items-start justify-between gap-4">
            <div class="min-w-0"><a href="#/event/${e.id}" class="font-semibold hover:text-brand-700 hover:underline">${esc(e.title)}</a>
              <p class="text-sm text-stone-700">${esc(t.task_name)} · ${fmtSlot(t.slot_start, t.slot_end)}</p>
              <p class="muted">${fmtDate(e.event_date)} · ${esc(e.location)}</p><p class="mt-1 text-xs text-stone-400">Applied ${fmtDate(a.applied_at)}</p></div>
            <div class="flex flex-col items-end gap-2">${badge(a.status)}${a.status === "pending" ? btn("withdraw", "Withdraw", `data-id="${a.id}" data-confirm="Withdraw this application? Your slot will be released."`) : ""}</div></li>`;
        })
        .join("")}</ul>`;
  };

  views.profile = () => {
    const u = me();
    const p = profileOf(u.id) ?? {};
    return `<div class="mx-auto max-w-2xl">
      <h1 class="h1">My volunteer profile</h1>
      <p class="muted mt-1 mb-6">${profileOf(u.id) ? "Keep your details up to date so coordinators can reach you." : "Complete your profile to start applying for volunteer tasks."}</p>
      <form data-form="profile" class="card grid gap-4 sm:grid-cols-2" novalidate>
        ${field("Full name", "name", `<input id="name" name="name" value="${esc(u.name)}" required class="input" />`, "sm:col-span-2")}
        ${field("Email", "email", `<input id="email" value="${esc(u.email)}" disabled class="input bg-stone-100 text-stone-500" />`, "sm:col-span-2")}
        ${field("Age", "age", `<input id="age" name="age" type="number" inputmode="numeric" min="12" max="100" value="${esc(p.age)}" required class="input" />`)}
        ${field("Gender", "gender", `<select id="gender" name="gender" required class="input"><option value="">Select…</option>${options(GENDERS, p.gender)}</select>`)}
        ${field("Mobile number", "phone", `<input id="phone" name="phone" type="tel" placeholder="012-345 6789" value="${esc(p.phone)}" required class="input" />`)}
        ${field("T-shirt size", "tshirt_size", `<select id="tshirt_size" name="tshirt_size" required class="input"><option value="">Select…</option>${options(TSHIRT, p.tshirt_size)}</select>`)}
        ${field("Emergency contact (name & phone)", "emergency_contact", `<input id="emergency_contact" name="emergency_contact" placeholder="Aminah (mother) – 013-987 6543" value="${esc(p.emergency_contact)}" required class="input" />`, "sm:col-span-2")}
        ${field("Skills", "skills", `<textarea id="skills" name="skills" rows="3" placeholder="e.g. First aid, crowd control, photography, driving" required class="input">${esc(p.skills)}</textarea>`, "sm:col-span-2")}
        ${field("Organization affiliation (optional)", "organization", `<input id="organization" name="organization" value="${esc(p.organization)}" class="input" />`, "sm:col-span-2")}
        <div class="space-y-3 sm:col-span-2">${formError}<button class="btn btn-primary">Save profile</button></div>
      </form></div>`;
  };

  // ---- admin

  views.admin = () => {
    const u = me();
    const evs = managedEvents(u);
    const t = today();
    let pending = 0, approved = 0;
    evs.forEach((e) => {
      const s = summary(e.id);
      pending += s.pending;
      approved += s.approved;
    });
    const table = (title, list) => `<section class="card overflow-hidden p-0"><h2 class="h2 px-5 pt-4 pb-2">${title}</h2>
      ${list.length === 0 ? `<p class="muted px-5 pb-5">No events. <a href="#/admin/new" class="font-semibold text-brand-700 hover:underline">Create one</a></p>` : `<div class="overflow-x-auto"><table class="table"><thead><tr><th>Event</th><th>Date</th><th>Registration</th><th class="text-right">Filled</th><th class="text-right">Pending</th><th></th></tr></thead><tbody>${list
        .map((e) => {
          const s = summary(e.id);
          const open = regOpen(e);
          return `<tr><td class="font-medium"><a href="#/admin/event/${e.id}" class="hover:text-brand-700 hover:underline">${esc(e.title)}</a></td><td class="whitespace-nowrap">${fmtDate(e.event_date)}</td>
            <td><span class="${open ? "text-brand-700" : "text-stone-500"}">${open ? "Open" : "Closed"}</span></td><td class="text-right whitespace-nowrap">${s.pending + s.approved} / ${s.capacity}</td>
            <td class="text-right ${s.pending ? "font-semibold text-amber-700" : ""}">${s.pending}</td><td class="text-right whitespace-nowrap"><a href="#/admin/event/${e.id}/apps" class="text-sm font-semibold text-brand-700 hover:underline">Applications</a></td></tr>`;
        })
        .join("")}</tbody></table></div>`}</section>`;
    return `<div class="space-y-6">
      <div class="flex flex-wrap items-end justify-between gap-3"><div><h1 class="h1">Admin dashboard</h1><p class="muted mt-1">${u.role === "super_admin" ? "All events" : "Events you created"}</p></div><a href="#/admin/new" class="btn btn-primary">+ Create event</a></div>
      <div class="grid grid-cols-3 gap-3">${stat("Upcoming events", evs.filter((e) => e.event_date >= t).length)}${stat("Pending review", pending, pending > 0)}${stat("Approved volunteers", approved)}</div>
      ${table("Upcoming events", evs.filter((e) => e.event_date >= t))}
      ${evs.some((e) => e.event_date < t) ? table("Past events", evs.filter((e) => e.event_date < t)) : ""}
    </div>`;
  };

  const eventForm = (e = {}) => `<form data-form="event" class="grid gap-4 sm:grid-cols-2" novalidate>
    ${e.id ? `<input type="hidden" name="id" value="${e.id}" />` : ""}
    ${field("Event name", "title", `<input id="title" name="title" required maxlength="200" value="${esc(e.title)}" placeholder="Palestine Charity Run" class="input" />`, "sm:col-span-2")}
    ${field("Description", "description", `<textarea id="description" name="description" rows="4" placeholder="Annual charity run" class="input">${esc(e.description)}</textarea>`, "sm:col-span-2")}
    ${field("Location", "location", `<input id="location" name="location" required value="${esc(e.location)}" placeholder="Putrajaya" class="input" />`, "sm:col-span-2")}
    ${field("Event date", "event_date", `<input id="event_date" name="event_date" type="date" required value="${esc(e.event_date)}" class="input" />`)}
    ${field("Registration deadline", "registration_deadline", `<input id="registration_deadline" name="registration_deadline" type="date" required value="${esc(e.registration_deadline)}" class="input" />`)}
    ${field("Status", "status", `<select id="status" name="status" class="input">${options(["open", "closed"], e.status ?? "open", { open: "Open", closed: "Closed" })}</select>`)}
    <div class="space-y-3 sm:col-span-2">${formError}<button class="btn btn-primary">${e.id ? "Save changes" : "Create event"}</button></div></form>`;

  views.adminNew = () => `<div class="mx-auto max-w-2xl"><h1 class="h1 mb-1">Create event</h1><p class="muted mb-6">After creating the event you'll add volunteer tasks and slots.</p><div class="card">${eventForm()}</div></div>`;

  const taskForm = (eventId, t) => {
    const k = t?.id ?? "new";
    const full = t ? !t.slot_start : false;
    return `<form data-form="task" class="space-y-3" novalidate>
      <input type="hidden" name="event_id" value="${eventId}" />${t ? `<input type="hidden" name="id" value="${t.id}" />` : ""}
      <div class="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto_1fr] sm:items-end">
        ${field("Task", `n-${k}`, `<input id="n-${k}" name="task_name" required value="${esc(t?.task_name)}" placeholder="Registration Counter" class="input" />`)}
        ${field("Start", `s-${k}`, `<input id="s-${k}" name="slot_start" type="time" ${full ? "disabled" : ""} value="${esc(t?.slot_start)}" class="input disabled:bg-stone-100" />`)}
        ${field("End", `e-${k}`, `<input id="e-${k}" name="slot_end" type="time" ${full ? "disabled" : ""} value="${esc(t?.slot_end)}" class="input disabled:bg-stone-100" />`)}
        <label class="flex min-h-10 items-center gap-2 text-sm whitespace-nowrap"><input type="checkbox" name="full_day" data-fullday ${full ? "checked" : ""} class="size-4 accent-brand-600" /> Full day</label>
        ${field("Capacity", `c-${k}`, `<input id="c-${k}" name="capacity" type="number" min="1" max="500" required value="${esc(t?.capacity)}" class="input" />`)}
      </div>${formError}
      <div class="flex gap-2"><button class="btn btn-primary ${t ? "btn-sm" : ""}">${t ? "Save task" : "Add task"}</button>${t ? btn("editTask", "Close", `data-id="${t.id}"`) : ""}</div></form>`;
  };

  function guardEvent(id) {
    const e = eventById(id);
    if (!e) return { html: views.notFound() };
    if (!canManage(me(), e))
      return { html: `<div class="card"><p>This event was created by another coordinator, so you can't manage it.</p><a href="#/admin" class="btn btn-secondary btn-sm mt-3">Back to admin</a></div>` };
    return { e };
  }

  views.adminEvent = ([id]) => {
    const { e, html } = guardEvent(id);
    if (html) return html;
    const tasks = tasksOf(id);
    return `<div class="space-y-6">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div><a href="#/admin" class="text-sm text-brand-700 hover:underline">← Admin</a><h1 class="h1 mt-1">${esc(e.title)}</h1></div>
        <div class="flex flex-wrap gap-2"><a href="#/admin/event/${id}/apps" class="btn btn-primary btn-sm">Review applications</a><a href="#/event/${id}" class="btn btn-secondary btn-sm">View public page</a>
          ${btn("setStatus", e.status === "open" ? "Close registration" : "Open registration", `data-id="${id}"`)}</div>
      </div>
      <section class="card"><h2 class="h2 mb-1">Volunteer tasks</h2><p class="muted mb-4">Each task has a time slot and a capacity. Once capacity is reached, no further applications are accepted.</p>
        ${tasks.length ? `<ul class="mb-6 divide-y divide-stone-100 rounded-lg border border-stone-200">${tasks
          .map((t) => {
            const taken = takenOf(t.id);
            const full = taken >= t.capacity;
            return `<li class="flex flex-wrap items-center gap-x-4 gap-y-2 p-3">
              <div class="min-w-40 flex-1"><p class="font-medium">${esc(t.task_name)}</p><p class="muted">${fmtSlot(t.slot_start, t.slot_end)}</p></div>
              <p class="text-sm"><span class="font-semibold ${full ? "text-accent-700" : ""}">${taken} / ${t.capacity}</span> <span class="text-stone-500">${full ? "Full" : "filled"}</span></p>
              <div class="flex gap-2">${btn("editTask", ui.editTask === t.id ? "Editing" : "Edit", `data-id="${t.id}"`)}${btn("deleteTask", "Delete", `data-id="${t.id}" data-confirm="${esc(taken ? `Delete “${t.task_name}”? ${taken} application(s) for it will also be deleted.` : `Delete “${t.task_name}”?`)}"`)}</div>
              ${ui.editTask === t.id ? `<div class="mt-1 w-full rounded-lg border border-stone-200 bg-stone-50 p-3">${taskForm(id, t)}</div>` : ""}</li>`;
          })
          .join("")}</ul>` : ""}
        <h3 class="mb-2 font-semibold">Add a task</h3>${taskForm(id)}
      </section>
      <section class="card"><h2 class="h2 mb-4">Event details</h2>${eventForm(e)}</section>
      <section class="card border-red-200"><h2 class="h2 mb-1 text-red-800">Delete event</h2><p class="muted mb-3">Permanently deletes the event, its tasks and all applications.</p>
        ${btn("deleteEvent", "Delete event", `data-id="${id}" data-confirm="${esc(`Permanently delete “${e.title}” and all its applications?`)}"`, "btn btn-danger btn-sm")}</section>
    </div>`;
  };

  views.adminApps = ([id], q) => {
    const { e, html } = guardEvent(id);
    if (html) return html;
    const status = ["pending", "approved", "rejected"].includes(q.get("status")) ? q.get("status") : "";
    const taskF = q.get("task") ?? "";
    const all = regsForEvent(id);
    const counts = { pending: 0, approved: 0, rejected: 0 };
    all.forEach((r) => counts[r.status]++);
    const rows = all.filter((r) => (!status || r.status === status) && (!taskF || r.task_id === taskF));
    const tasks = tasksOf(id);
    const link = (over) => {
      const p = new URLSearchParams();
      const m = { status, task: taskF, ...over };
      Object.entries(m).forEach(([k, v]) => v && p.set(k, v));
      const s = p.toString();
      return `#/admin/event/${id}/apps${s ? "?" + s : ""}`;
    };
    const chip = (href, on, label) =>
      `<a href="${href}" class="rounded-full px-3 py-1 ${on ? "bg-stone-900 text-white" : "bg-white text-stone-700 ring-1 ring-stone-200 hover:bg-stone-100"}">${label}</a>`;
    return `<div class="space-y-5">
      <div><a href="#/admin/event/${id}" class="text-sm text-brand-700 hover:underline">← ${esc(e.title)}</a><h1 class="h1 mt-1">Volunteer applications</h1><p class="muted">${fmtDate(e.event_date)} · ${esc(e.location)}</p></div>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">${stat("Total registrations", all.length)}${stat("Pending", counts.pending)}${stat("Approved", counts.approved)}${stat("Rejected", counts.rejected)}</div>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap gap-1 text-sm">${chip(link({ status: "" }), !status, "All")}${["pending", "approved", "rejected"].map((s) => chip(link({ status: s }), status === s, `${cap(s)} (${counts[s]})`)).join("")}</div>
        <div class="flex gap-2">${btn("exportXlsx", "Export Excel", `data-id="${id}" data-status="${status}"`, "btn btn-primary btn-sm")}${btn("exportCsv", "Export CSV", `data-id="${id}" data-status="${status}"`)}</div>
      </div>
      ${tasks.length > 1 ? `<div class="flex flex-wrap gap-1 text-sm"><span class="py-1 pr-1 text-stone-500">Task:</span>${chip(link({ task: "" }), !taskF, "All tasks")}${tasks.map((t) => chip(link({ task: t.id }), taskF === t.id, `${esc(t.task_name)} (${takenOf(t.id)}/${t.capacity})`)).join("")}</div>` : ""}
      ${rows.length === 0 ? `<p class="card muted">No applications match this filter.</p>` : `<div class="card overflow-x-auto p-0"><table class="table"><thead><tr><th>Name</th><th>Contact</th><th>Task</th><th>Profile</th><th>Applied</th><th>Status</th><th class="text-right">Action</th></tr></thead><tbody>${rows
        .map((r) => {
          const u = userById(r.user_id);
          const p = profileOf(r.user_id);
          const t = taskById(r.task_id);
          return `<tr><td class="font-medium">${esc(u.name)}</td>
            <td><span class="block text-brand-700">${esc(u.email)}</span>${p?.phone ? `<span class="block text-stone-600">${esc(p.phone)}</span>` : ""}</td>
            <td>${esc(t.task_name)}<span class="block text-xs text-stone-500">${fmtSlot(t.slot_start, t.slot_end)}</span></td>
            <td class="text-xs text-stone-600">${p ? `${esc(p.age)} · ${esc(p.gender)} · ${esc(p.tshirt_size)}<span class="block max-w-48 truncate" title="${esc(p.skills)}">${esc(p.skills)}</span>${p.organization ? `<span class="block">${esc(p.organization)}</span>` : ""}` : "—"}</td>
            <td class="whitespace-nowrap">${fmtDate(r.applied_at)}</td><td>${badge(r.status)}</td>
            <td><div class="flex justify-end gap-2">${r.status !== "approved" ? btn("review", "Approve", `data-id="${r.id}" data-status="approved"`, "btn btn-primary btn-sm") : ""}${r.status !== "rejected" ? btn("review", "Reject", `data-id="${r.id}" data-status="rejected" data-confirm="${esc(`Reject ${u.name}'s application? They will be emailed.`)}"`) : ""}</div></td></tr>`;
        })
        .join("")}</tbody></table></div>`}
    </div>`;
  };

  views.adminReports = () => {
    const evs = managedEvents(me());
    const tot = { total: 0, approved: 0, pending: 0, rejected: 0 };
    const rows = evs
      .map((e) => {
        const s = summary(e.id);
        Object.keys(tot).forEach((k) => (tot[k] += s[k]));
        return `<tr><td class="font-medium"><a href="#/admin/event/${e.id}/apps" class="hover:text-brand-700 hover:underline">${esc(e.title)}</a></td><td class="whitespace-nowrap">${fmtDate(e.event_date)}</td>
          <td class="text-right">${s.capacity}</td><td class="text-right">${s.total}</td><td class="text-right text-brand-700">${s.approved}</td><td class="text-right text-amber-700">${s.pending}</td><td class="text-right text-stone-500">${s.rejected}</td>
          <td class="whitespace-nowrap">${btn("exportXlsx", "Excel", `data-id="${e.id}" data-status=""`, "font-semibold text-brand-700 hover:underline cursor-pointer")} · ${btn("exportCsv", "CSV", `data-id="${e.id}" data-status=""`, "text-brand-700 hover:underline cursor-pointer")} · ${btn("exportXlsx", "Approved only", `data-id="${e.id}" data-status="approved"`, "text-brand-700 hover:underline cursor-pointer")}</td></tr>`;
      })
      .join("");
    return `<div class="space-y-5"><div><h1 class="h1">Reports</h1><p class="muted mt-1">Event summary and volunteer listings. Export any listing to Excel or CSV.</p></div>
      ${evs.length === 0 ? `<p class="card muted">No events yet.</p>` : `<div class="card overflow-x-auto p-0"><table class="table"><thead><tr><th>Event</th><th>Date</th><th class="text-right">Capacity</th><th class="text-right">Total registrations</th><th class="text-right">Approved</th><th class="text-right">Pending</th><th class="text-right">Rejected</th><th>Volunteer list</th></tr></thead>
        <tbody>${rows}</tbody><tfoot><tr class="font-semibold"><td class="px-3 py-2" colspan="3">All events</td><td class="px-3 py-2 text-right">${tot.total}</td><td class="px-3 py-2 text-right">${tot.approved}</td><td class="px-3 py-2 text-right">${tot.pending}</td><td class="px-3 py-2 text-right">${tot.rejected}</td><td></td></tr></tfoot></table></div>`}</div>`;
  };

  views.adminUsers = (_, q) => {
    const u = me();
    if (u.role !== "super_admin") return `<p class="card">Only a Super Admin can manage users. <a href="#/login" class="font-semibold text-brand-700 underline">Log in as Nur Aisyah</a> to try it.</p>`;
    const s = (q.get("q") ?? "").toLowerCase();
    const list = db.users.filter((x) => !s || x.name.toLowerCase().includes(s) || x.email.includes(s));
    return `<div class="space-y-5"><div><h1 class="h1">Users</h1><p class="muted mt-1">Promote volunteers to Event Coordinators or Super Admins.</p></div>
      <form data-form="search" class="flex max-w-md gap-2"><input name="q" value="${esc(s)}" placeholder="Search name or email" class="input" aria-label="Search users" /><button class="btn btn-secondary">Search</button></form>
      <div class="card overflow-x-auto p-0"><table class="table"><thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead><tbody>${list
        .map((x) => `<tr><td class="font-medium">${esc(x.name)}</td><td>${esc(x.email)}</td><td>${x.id === u.id ? `<span class="text-sm">${ROLE_LABEL[x.role]} (you)</span>` : `<form data-form="role" class="flex flex-wrap items-center gap-2"><input type="hidden" name="user_id" value="${x.id}" /><select name="role" class="input w-auto py-1" aria-label="Role">${options(Object.keys(ROLE_LABEL), x.role, ROLE_LABEL)}</select><button class="btn btn-secondary btn-sm">Save</button></form>`}</td></tr>`)
        .join("") || `<tr><td colspan="3" class="muted">No users found.</td></tr>`}</tbody></table></div></div>`;
  };

  views.outbox = () => `<div class="space-y-5">
    <div class="flex flex-wrap items-end justify-between gap-3"><div><h1 class="h1">Email outbox</h1><p class="muted mt-1">Notification emails the platform would send (FR-08). In the real app these go out via email.</p></div>${db.outbox.length ? btn("clearOutbox", "Clear outbox") : ""}</div>
    ${db.outbox.length === 0 ? `<p class="card muted">No emails yet. Apply for a task, or approve/reject an application as a coordinator, and the email will appear here.</p>` : db.outbox
      .map((m) => `<article class="card"><div class="flex flex-wrap items-baseline justify-between gap-2 border-b border-stone-100 pb-3"><h2 class="font-semibold">${esc(m.subject)}</h2><span class="text-xs text-stone-500">${new Date(m.at).toLocaleString("en-MY")}</span></div>
        <p class="mt-3 text-sm text-stone-500">To: ${esc(m.name)} &lt;${esc(m.to)}&gt;</p><p class="mt-3 text-sm">Hi ${esc(m.name)},</p><p class="mt-2 text-sm">${esc(m.body)}</p>
        <p class="mt-3 text-sm"><b>Event:</b> ${esc(m.details.event)}<br /><b>Task:</b> ${esc(m.details.task)} (${esc(m.details.slot)})<br /><b>Date:</b> ${esc(m.details.date)}<br /><b>Location:</b> ${esc(m.details.location)}</p></article>`)
      .join("")}</div>`;

  views.notFound = () => `<div class="mx-auto max-w-md py-12 text-center"><h1 class="h1">Page not found</h1><p class="muted mt-2">The page you're looking for doesn't exist or has been removed.</p><a href="#/events" class="btn btn-primary mt-6">Browse events</a></div>`;

  // ---------------------------------------------------------------- router

  const ROUTES = [
    [/^\/$/, "home", "Home"],
    [/^\/events$/, "events", "Events"],
    [/^\/event\/([\w-]+)$/, "event", "Event"],
    [/^\/login$/, "login", "Log in"],
    [/^\/register$/, "register", "Register"],
    [/^\/dashboard$/, "dashboard", "Dashboard", "user"],
    [/^\/applications$/, "applications", "My Applications", "user"],
    [/^\/profile$/, "profile", "Profile", "user"],
    [/^\/admin$/, "admin", "Admin", "staff"],
    [/^\/admin\/new$/, "adminNew", "Create Event", "staff"],
    [/^\/admin\/event\/([\w-]+)$/, "adminEvent", "Manage Event", "staff"],
    [/^\/admin\/event\/([\w-]+)\/apps$/, "adminApps", "Applications", "staff"],
    [/^\/admin\/reports$/, "adminReports", "Reports", "staff"],
    [/^\/admin\/users$/, "adminUsers", "Users", "staff"],
    [/^\/outbox$/, "outbox", "Email outbox"],
  ];

  function go(hash) {
    if (location.hash === hash) render();
    else location.hash = hash;
  }

  function nav() {
    const u = me();
    const links = [["#/events", "Events"]];
    if (u) {
      links.push(["#/dashboard", "Dashboard"], ["#/applications", "My Applications"], ["#/profile", "Profile"]);
      if (isStaff(u)) links.push(["#/admin", "Admin"]);
    }
    const adminLinks = [["#/admin", "Dashboard"], ["#/admin/new", "Create Event"], ["#/admin/reports", "Reports"]];
    if (u?.role === "super_admin") adminLinks.push(["#/admin/users", "Users"]);
    const here = location.hash || "#/";
    const linkCls = (h) => `rounded-md px-2 py-1.5 whitespace-nowrap ${here === h ? "bg-stone-100 font-semibold text-stone-900" : "text-stone-700 hover:bg-stone-100"}`;
    document.getElementById("nav").innerHTML = `<div class="container-page flex flex-wrap items-center gap-x-6 gap-y-2 py-3">
      <a href="#/" class="font-bold text-brand-700">Palestine Volunteers</a>
      <nav class="-mx-1 flex flex-1 gap-1 overflow-x-auto text-sm">${links.map(([h, l]) => `<a href="${h}" class="${linkCls(h)}">${l}</a>`).join("")}</nav>
      <div class="flex items-center gap-2">${u ? `<span class="hidden text-xs text-stone-500 sm:inline">${esc(u.name)} · ${ROLE_LABEL[u.role]}</span><a href="#/login" class="btn btn-secondary btn-sm">Switch role</a>${btn("logout", "Log out")}` : `<a href="#/login" class="btn btn-secondary btn-sm">Log in</a><a href="#/register" class="btn btn-primary btn-sm">Register</a>`}</div>
    </div>${isStaff(u) && here.startsWith("#/admin") ? `<div class="container-page"><nav aria-label="Admin" class="-mx-1 flex gap-1 overflow-x-auto pb-2 text-sm">${adminLinks.map(([h, l]) => `<a href="${h}" class="${linkCls(h)}">${l}</a>`).join("")}</nav></div>` : ""}`;
  }

  function render() {
    const raw = (location.hash || "#/").slice(1);
    const [path, qs] = raw.split("?");
    const q = new URLSearchParams(qs ?? "");
    const u = me();
    let html = views.notFound();
    let title = "Not found";
    for (const [re, name, t, guard] of ROUTES) {
      const m = path.match(re);
      if (!m) continue;
      title = t;
      if (guard && !u) html = views.login();
      else if (guard === "staff" && !isStaff(u))
        html = `<p class="card">This page is for coordinators. <a href="#/login" class="font-semibold text-brand-700 underline">Switch to a coordinator account</a> to see it.</p>`;
      else html = views[name](m.slice(1), q);
      break;
    }
    document.title = `${title} · Palestine Volunteers Demo`;
    nav();
    const app = document.getElementById("app");
    app.innerHTML = html;
  }

  // ---------------------------------------------------------------- events

  let toastTimer;
  function toast(msg, isError) {
    const el = document.getElementById("toast");
    el.innerHTML = `<div class="pointer-events-auto max-w-lg rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${isError ? "bg-red-700 text-white" : "bg-stone-900 text-white"}">${esc(msg)}</div>`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.innerHTML = ""), 4500);
  }

  document.addEventListener("click", async (ev) => {
    const el = ev.target.closest("[data-action]");
    if (!el) return;
    ev.preventDefault();
    if (el.dataset.confirm && !confirm(el.dataset.confirm)) return;
    try {
      el.disabled = true;
      const msg = await actions[el.dataset.action](ev, el);
      save();
      render();
      if (msg) toast(msg);
    } catch (err) {
      if (!(err instanceof Fail)) console.error(err);
      toast(err instanceof Fail ? err.message : "Something went wrong.", true);
      el.disabled = false;
    }
  });

  document.addEventListener("submit", (ev) => {
    const form = ev.target.closest("form[data-form]");
    if (!form) return;
    ev.preventDefault();
    const name = form.dataset.form;
    const fd = new FormData(form);
    if (name === "search") {
      const v = String(fd.get("q") ?? "").trim();
      location.hash = "#/admin/users" + (v ? "?q=" + encodeURIComponent(v) : "");
      return;
    }
    const errEl = form.querySelector("[data-error]");
    try {
      const msg = forms[name](fd, form);
      save();
      render();
      if (msg) toast(msg);
    } catch (err) {
      if (!(err instanceof Fail)) console.error(err);
      const text = err instanceof Fail ? err.message : "Something went wrong.";
      if (errEl) {
        errEl.textContent = text;
        errEl.classList.remove("hidden");
      } else toast(text, true);
    }
  });

  document.addEventListener("change", (ev) => {
    const cb = ev.target.closest("[data-fullday]");
    if (!cb) return;
    cb.closest("form").querySelectorAll('input[type="time"]').forEach((i) => (i.disabled = cb.checked));
  });

  window.addEventListener("hashchange", () => {
    ui.editTask = null;
    render();
    window.scrollTo(0, 0);
  });
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      db = load();
      render();
    }
  });

  render();
  if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
})();
