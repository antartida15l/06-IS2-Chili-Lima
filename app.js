const STORAGE_KEY = "is2-loans-v1";

const equipmentCatalog = [
  { id: "EQ-01", name: "Laptop Lenovo",        category: "Cómputo",     emoji: "💻" },
  { id: "EQ-02", name: "Laptop HP",            category: "Cómputo",     emoji: "💻" },
  { id: "EQ-03", name: "Proyector Epson",      category: "Audiovisual", emoji: "📽️" },
  { id: "EQ-04", name: "Cámara Canon",         category: "Audiovisual", emoji: "📷" },
  { id: "EQ-05", name: "Tablet Samsung",       category: "Cómputo",     emoji: "📱" },
  { id: "EQ-06", name: "Micrófono inalámbrico",category: "Audiovisual", emoji: "🎙️" },
  { id: "EQ-07", name: "Router TP-Link",       category: "Redes",       emoji: "📡" },
  { id: "EQ-08", name: "Kit Arduino",          category: "Laboratorio", emoji: "🔬" }
];

const form            = document.querySelector("#loanForm");
const equipmentSelect = document.querySelector("#equipment");
const borrowerInput   = document.querySelector("#borrower");
const loanDateInput   = document.querySelector("#loanDate");
const returnDateInput = document.querySelector("#returnDate");
const loanList        = document.querySelector("#loanList");
const emptyState      = document.querySelector("#emptyState");
const activeCount     = document.querySelector("#activeCount");
const borrowerError   = document.querySelector("#borrowerError");

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(dateValue) {
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" })
    .format(new Date(`${dateValue}T00:00:00`));
}

function esDiaHabil(fechaISO) {
  const dia = new Date(`${fechaISO}T00:00:00`).getDay();
  return dia !== 0 && dia !== 6;
}

function nombreDia(fechaISO) {
  return new Date(`${fechaISO}T00:00:00`)
    .toLocaleDateString("es-PE", { weekday: "long" });
}

function nextBusinessDay() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function getNextBusinessFrom(isoDate) {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function loadLoans() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function saveLoans(loans) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(loans));
}

function activeEquipmentIds(loans) {
  return new Set(loans.filter(l => l.status === "Activo").map(l => l.equipmentId));
}

let dialogOverlay = null;

const DIALOG_ICONS = {
  error:    "✕",
  success:  "✓",
  warning:  "⚠",
  info:     "ℹ",
  question: "↩"
};

function ensureDialogOverlay() {
  if (dialogOverlay) return dialogOverlay;
  dialogOverlay = document.createElement("div");
  dialogOverlay.id = "dialogOverlay";
  dialogOverlay.className = "dialog-overlay";
  dialogOverlay.innerHTML = `
    <div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dialogTitle">
      <div class="dialog__icon" id="dialogIcon"></div>
      <h3 class="dialog__title" id="dialogTitle"></h3>
      <p class="dialog__body" id="dialogBody"></p>
      <div class="dialog__actions" id="dialogActions"></div>
    </div>`;
  document.body.appendChild(dialogOverlay);
  return dialogOverlay;
}

function closeDialog() {
  if (!dialogOverlay) return;
  clearTimeout(dialogOverlay._autoTimer);
  dialogOverlay.classList.remove("dialog-overlay--visible");
}

function showDialog({ type = "info", icon, title, message, buttons, autoClose = null }) {
  const overlay = ensureDialogOverlay();

  const iconEl = overlay.querySelector("#dialogIcon");
  iconEl.textContent = icon || DIALOG_ICONS[type] || DIALOG_ICONS.info;
  iconEl.className = `dialog__icon dialog__icon--${type}`;

  overlay.querySelector("#dialogTitle").textContent = title;
  overlay.querySelector("#dialogBody").textContent = message;

  const actions = overlay.querySelector("#dialogActions");
  actions.innerHTML = "";

  const btns = (buttons && buttons.length) ? buttons : [{ label: "Entendido", primary: true }];
  btns.forEach(b => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `btn ${b.primary ? "btn--confirm" : "btn--ghost-dark"}`;
    btn.textContent = b.label;
    btn.addEventListener("click", () => {
      closeDialog();
      if (b.onClick) b.onClick();
    });
    actions.appendChild(btn);
  });

  overlay.classList.add("dialog-overlay--visible");

  overlay.onclick = (e) => {
    if (e.target === overlay && btns.length === 1) closeDialog();
  };

  clearTimeout(overlay._autoTimer);
  if (autoClose) {
    overlay._autoTimer = setTimeout(closeDialog, autoClose);
  }
}

function notify(message, type = "error", opts = {}) {
  const titles = {
    error:   "No se pudo completar",
    success: "¡Listo!",
    warning: "Atención",
    info:    "Aviso"
  };
  showDialog({
    type,
    title: opts.title || titles[type] || titles.info,
    message,
    autoClose: opts.autoClose ?? (type === "success" || type === "info" ? 2400 : null)
  });
}

function renderEquipmentOptions() {
  const current = equipmentSelect.value;
  const busy = activeEquipmentIds(loadLoans());
  equipmentSelect.innerHTML = '<option value="">— Seleccione un equipo —</option>';

  const categories = [...new Set(equipmentCatalog.map(e => e.category))];
  categories.forEach(cat => {
    const group = document.createElement("optgroup");
    group.label = cat;
    equipmentCatalog.filter(e => e.category === cat).forEach(item => {
      const opt = document.createElement("option");
      opt.value = item.id;
      const available = !busy.has(item.id);
      opt.textContent = `${item.emoji}  ${item.name}${available ? "" : " — no disponible"}`;
      opt.disabled = !available;
      group.appendChild(opt);
    });
    equipmentSelect.appendChild(group);
  });

  equipmentSelect.value = current;
}

function getStatusDays(loanDate, returnDate, status) {
  if (status !== "Activo") return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ret = new Date(`${returnDate}T00:00:00`);
  const diff = Math.ceil((ret - today) / 86400000);
  if (diff < 0) return { label: `Vencido ${Math.abs(diff)}d`, cls: "overdue" };
  if (diff === 0) return { label: "Vence hoy", cls: "due-today" };
  return { label: `${diff}d restantes`, cls: "on-time" };
}

function renderLoans() {
  const loans = loadLoans();
  loanList.innerHTML = "";

  loans.forEach((loan, i) => {
    const isActive = loan.status === "Activo";
    const eq = equipmentCatalog.find(e => e.id === loan.equipmentId);
    const emoji = eq ? eq.emoji : "📦";
    const days = getStatusDays(loan.loanDate, loan.returnDate, loan.status);

    const row = document.createElement("tr");
    row.style.animationDelay = `${i * 30}ms`;
    row.className = "loan-row";
    row.innerHTML = `
      <td>
        <div class="equipment-cell">
          <span class="eq-emoji">${emoji}</span>
          <div>
            <div class="eq-name">${loan.equipmentName}</div>
            <div class="eq-cat">${eq ? eq.category : ""}</div>
          </div>
        </div>
      </td>
      <td><span class="borrower-name">${loan.borrower}</span></td>
      <td class="date-cell">${formatDate(loan.loanDate)}</td>
      <td class="date-cell">${formatDate(loan.returnDate)}</td>
      <td>
        <div class="status-cell">
          <span class="status ${isActive ? "status-active" : "status-returned"}">
            ${isActive ? "Activo" : "Devuelto"}
          </span>
          ${days ? `<span class="days-badge days-badge--${days.cls}">${days.label}</span>` : ""}
        </div>
      </td>
      <td>
        ${isActive
          ? `<button type="button" class="return-btn" data-id="${loan.id}"
               data-name="${loan.equipmentName}" data-borrower="${loan.borrower}">
               ↩ Devolver
             </button>`
          : `<span class="action-done">✓</span>`}
      </td>`;
    loanList.appendChild(row);
  });

  const active = loans.filter(l => l.status === "Activo").length;
  activeCount.textContent = `${active} activo${active === 1 ? "" : "s"}`;
  emptyState.hidden = loans.length !== 0;
  renderEquipmentOptions();
}


const NAME_REGEX = /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s\-'\.]+$/;

borrowerInput.addEventListener("input", () => {
  const val = borrowerInput.value;
  const hadDigits = /\d/.test(val);
  const cleaned = val.replace(/[^a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s\-'\.]/g, "");

  if (val !== cleaned) {
    borrowerInput.value = cleaned;
    const msg = hadDigits
      ? "El nombre no puede contener números."
      : "Solo se permiten letras, espacios, tildes y guiones.";
    showFieldError(borrowerError, borrowerInput, msg);
  } else {
    clearFieldError(borrowerError, borrowerInput);
  }
});

borrowerInput.addEventListener("blur", () => {
  const val = borrowerInput.value.trim();
  if (val.length > 0 && val.length < 3) {
    showFieldError(borrowerError, borrowerInput, "El nombre debe tener al menos 3 caracteres.");
  } else {
    clearFieldError(borrowerError, borrowerInput);
  }
});

function showFieldError(el, input, msg) {
  if (el) { el.textContent = msg; el.hidden = false; }
  input.classList.add("field__control--error");
}

function clearFieldError(el, input) {
  if (el) { el.textContent = ""; el.hidden = true; }
  input.classList.remove("field__control--error");
}

function setupDateConstraints() {
  const today = todayISO();
  loanDateInput.min = today;

  const max = new Date();
  max.setMonth(max.getMonth() + 6);
  loanDateInput.max = max.toISOString().slice(0, 10);
  returnDateInput.max = max.toISOString().slice(0, 10);

  const nb = nextBusinessDay();
  loanDateInput.value = nb;
  returnDateInput.value = nb;
  returnDateInput.min = nb;
}

function updateReturnMin() {
  returnDateInput.min = loanDateInput.value;
  if (returnDateInput.value && returnDateInput.value < loanDateInput.value) {
    returnDateInput.value = loanDateInput.value;
  }
}

function handleWeekendLoanDate(fechaISO, { onResolved } = {}) {
  const dia = capitalize(nombreDia(fechaISO));
  const next = getNextBusinessFrom(fechaISO);
  const nextDia = capitalize(nombreDia(next));

  showDialog({
    type: "warning",
    icon: "📅",
    title: "Fecha no válida",
    message: `La fecha de préstamo seleccionada (${dia} ${formatDate(fechaISO)}) no es un día hábil. Solo se permiten préstamos de lunes a viernes.`,
    buttons: [
      {
        label: "Elegir otra fecha",
        onClick: () => {
          loanDateInput.value = "";
          loanDateInput.focus();
          if (onResolved) onResolved(false);
        }
      },
      {
        label: `Sí, usar ${nextDia} ${formatDate(next)}`,
        primary: true,
        onClick: () => {
          loanDateInput.value = next;
          updateReturnMin();
          notify(`Fecha de préstamo ajustada a ${nextDia} ${formatDate(next)}.`, "success");
          if (onResolved) onResolved(true, next);
        }
      }
    ]
  });
}

loanDateInput.addEventListener("change", () => {
  const val = loanDateInput.value;
  if (!val) return;

  if (!esDiaHabil(val)) {
    handleWeekendLoanDate(val);
    return;
  }
  updateReturnMin();
});

returnDateInput.addEventListener("change", () => {
  if (!returnDateInput.value) return;
  if (returnDateInput.value < loanDateInput.value) {
    notify("La fecha de devolución no puede ser anterior a la fecha de préstamo. Se ajustó automáticamente.", "warning");
    returnDateInput.value = loanDateInput.value;
  }
});


form.addEventListener("submit", (e) => {
  e.preventDefault();

  const equipment   = equipmentCatalog.find(item => item.id === equipmentSelect.value);
  const borrower    = borrowerInput.value.trim();
  const loanDate    = loanDateInput.value;
  const returnDate  = returnDateInput.value;

  if (!equipment) {
    notify("Selecciona un equipo del catálogo.", "error");
    equipmentSelect.focus();
    return;
  }

  if (!borrower) {
    notify("Ingresa el nombre del solicitante.", "error");
    borrowerInput.focus();
    return;
  }

  if (borrower.length < 3) {
    notify("El nombre debe tener al menos 3 caracteres.", "error");
    borrowerInput.focus();
    return;
  }

  if (!NAME_REGEX.test(borrower)) {
    notify("El nombre solo puede contener letras, espacios y guiones (sin números).", "error");
    borrowerInput.focus();
    return;
  }

  if (!loanDate || !returnDate) {
    notify("Completa ambas fechas.", "error");
    return;
  }

  // ── VALIDACIÓN 
  if (!esDiaHabil(loanDate)) {
    handleWeekendLoanDate(loanDate, {
      onResolved: (moved, newDate) => {
        if (moved) {
          // El usuario aceptó mover la fecha: reintenta el registro con la fecha nueva.
          registerLoan(equipment, borrower, newDate, returnDateInput.value);
        }
      }
    });
    return;
  }

  if (returnDate < loanDate) {
    notify("La fecha de devolución no puede ser anterior a la de préstamo.", "error");
    returnDateInput.focus();
    return;
  }

  if (activeEquipmentIds(loadLoans()).has(equipment.id)) {
    notify(`"${equipment.name}" ya está prestado y no está disponible.`, "error");
    equipmentSelect.focus();
    return;
  }

  registerLoan(equipment, borrower, loanDate, returnDate);
});

function registerLoan(equipment, borrower, loanDate, returnDate) {
  if (returnDate < loanDate) returnDate = loanDate;

  if (activeEquipmentIds(loadLoans()).has(equipment.id)) {
    notify(`"${equipment.name}" ya está prestado y no está disponible.`, "error");
    return;
  }

  const loans = loadLoans();
  loans.unshift({
    id: crypto.randomUUID(),
    equipmentId:   equipment.id,
    equipmentName: equipment.name,
    borrower,
    loanDate,
    returnDate,
    status: "Activo"
  });
  saveLoans(loans);

  form.reset();
  setupDateConstraints();
  clearFieldError(borrowerError, borrowerInput);

  notify(`${equipment.emoji} Préstamo de "${equipment.name}" registrado para ${borrower}.`, "success");
  renderLoans();
}

//  DEVOLUCIÓN con confirmación centrada
function confirmReturn(loanId, equipmentName, borrower) {
  showDialog({
    type: "question",
    title: "Confirmar devolución",
    message: `¿Confirmas la devolución de "${equipmentName}" de parte de ${borrower}?`,
    buttons: [
      { label: "Cancelar" },
      {
        label: "Sí, registrar devolución",
        primary: true,
        onClick: () => {
          const loans = loadLoans().map(l =>
            l.id === loanId ? { ...l, status: "Devuelto" } : l);
          saveLoans(loans);
          renderLoans();
          notify(`Devolución de "${equipmentName}" registrada.`, "success");
        }
      }
    ]
  });
}

loanList.addEventListener("click", (e) => {
  const btn = e.target.closest(".return-btn");
  if (!btn) return;
  confirmReturn(btn.dataset.id, btn.dataset.name, btn.dataset.borrower);
});

document.querySelector("#resetDemoBtn").addEventListener("click", () => {
  showDialog({
    type: "warning",
    title: "Restablecer datos",
    message: "¿Eliminar todos los préstamos guardados? Esta acción no se puede deshacer.",
    buttons: [
      { label: "Cancelar" },
      {
        label: "Sí, eliminar todo",
        primary: true,
        onClick: () => {
          localStorage.removeItem(STORAGE_KEY);
          renderLoans();
          notify("Datos restablecidos correctamente.", "info");
        }
      }
    ]
  });
});

setupDateConstraints();
renderLoans();
