const STORAGE_KEY = "is2-loans-v1";

const equipmentCatalog = [
  { id: "EQ-01", name: "Laptop Lenovo", category: "Cómputo" },
  { id: "EQ-02", name: "Laptop HP", category: "Cómputo" },
  { id: "EQ-03", name: "Proyector Epson", category: "Audiovisual" },
  { id: "EQ-04", name: "Cámara Canon", category: "Audiovisual" },
  { id: "EQ-05", name: "Tablet Samsung", category: "Cómputo" },
  { id: "EQ-06", name: "Micrófono inalámbrico", category: "Audiovisual" },
  { id: "EQ-07", name: "Router TP-Link", category: "Redes" },
  { id: "EQ-08", name: "Kit Arduino", category: "Laboratorio" }
];

const form = document.querySelector("#loanForm");
const equipmentSelect = document.querySelector("#equipment");
const borrowerInput = document.querySelector("#borrower");
const loanDateInput = document.querySelector("#loanDate");
const returnDateInput = document.querySelector("#returnDate");
const formMessage = document.querySelector("#formMessage");
const loanList = document.querySelector("#loanList");
const emptyState = document.querySelector("#emptyState");
const activeCount = document.querySelector("#activeCount");

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function loadLoans() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveLoans(loans) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(loans));
}

function activeEquipmentIds(loans) {
  return new Set(loans.filter((loan) => loan.status === "Activo").map((loan) => loan.equipmentId));
}

function renderEquipmentOptions() {
  const current = equipmentSelect.value;
  const busy = activeEquipmentIds(loadLoans());
  equipmentSelect.innerHTML = '<option value="">Seleccione un equipo</option>';
  equipmentCatalog.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = `${item.name} (${item.category})${busy.has(item.id) ? " — no disponible" : ""}`;
    option.disabled = busy.has(item.id);
    equipmentSelect.append(option);
  });
  equipmentSelect.value = current;
}

function formatDate(dateValue) {
  return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" }).format(new Date(`${dateValue}T00:00:00`));
}

function renderLoans() {
  const loans = loadLoans();
  loanList.innerHTML = "";
  loans.forEach((loan) => {
    const row = document.createElement("tr");
    const isActive = loan.status === "Activo";
    row.innerHTML = `
      <td>${loan.equipmentName}</td>
      <td>${loan.borrower}</td>
      <td>${formatDate(loan.loanDate)}</td>
      <td>${formatDate(loan.returnDate)}</td>
      <td><span class="status ${isActive ? "status-active" : "status-returned"}">${loan.status}</span></td>
      <td>${isActive ? `<button type="button" class="return-btn" data-id="${loan.id}">Registrar devolución</button>` : "—"}</td>`;
    loanList.append(row);
  });
  const active = loans.filter((loan) => loan.status === "Activo").length;
  activeCount.textContent = `${active} activo${active === 1 ? "" : "s"}`;
  emptyState.hidden = loans.length !== 0;
  renderEquipmentOptions();
}

function showMessage(message) {
  formMessage.textContent = message;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const equipment = equipmentCatalog.find((item) => item.id === equipmentSelect.value);
  const borrower = borrowerInput.value.trim();
  const loanDate = loanDateInput.value;
  const returnDate = returnDateInput.value;

  if (!equipment || !borrower || !loanDate || !returnDate) {
    showMessage("Complete todos los campos para registrar el préstamo.");
    return;
  }
  if (returnDate < loanDate) {
    showMessage("La fecha de devolución no puede ser anterior a la fecha de préstamo.");
    return;
  }
  if (activeEquipmentIds(loadLoans()).has(equipment.id)) {
    showMessage("El equipo seleccionado no está disponible.");
    return;
  }

  const loans = loadLoans();
  loans.unshift({
    id: crypto.randomUUID(),
    equipmentId: equipment.id,
    equipmentName: equipment.name,
    borrower,
    loanDate,
    returnDate,
    status: "Activo"
  });
  saveLoans(loans);
  form.reset();
  loanDateInput.value = todayISO();
  returnDateInput.value = todayISO();
  showMessage("");
  renderLoans();
});

loanList.addEventListener("click", (event) => {
  const button = event.target.closest(".return-btn");
  if (!button) return;
  const loans = loadLoans().map((loan) => loan.id === button.dataset.id ? { ...loan, status: "Devuelto" } : loan);
  saveLoans(loans);
  renderLoans();
});

document.querySelector("#resetDemoBtn").addEventListener("click", () => {
  if (confirm("¿Desea eliminar todos los préstamos guardados en este navegador?")) {
    localStorage.removeItem(STORAGE_KEY);
    showMessage("");
    renderLoans();
  }
});

loanDateInput.value = todayISO();
returnDateInput.value = todayISO();
renderLoans();
