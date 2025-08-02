// Mock Data
const mockFIRs = [
  {
    id: 1001,
    type: "Theft",
    location: "Downtown Market",
    reporter: "John Smith",
    contact: "9876543210",
    date: "2024-01-15",
    status: "Under Investigation",
    report:
      "A pickpocket incident occurred at around 6 PM in the crowded market area. The victim lost his wallet containing cash and ID documents.",
    images: [
      "https://via.placeholder.com/150?text=Wallet+Photo",
      "https://via.placeholder.com/150?text=CCTV+Footage",
    ],
    personDetails: {
      age: 42,
      gender: "Male",
      occupation: "Shopkeeper",
      address: "45A Market Street, Downtown",
    },
  },
  {
    id: 1002,
    type: "Assault",
    location: "Park Avenue",
    reporter: "Sarah Johnson",
    contact: "9123456780",
    date: "2024-01-14",
    status: "Reported",
    report:
      "Physical altercation between two individuals. One person sustained minor injuries and was treated at the nearby clinic.",
    images: [
      "https://via.placeholder.com/150?text=Injury+Photo",
      "https://via.placeholder.com/150?text=Witness+Sketch",
    ],
    personDetails: {
      age: 29,
      gender: "Female",
      occupation: "Teacher",
      address: "19B Rose Apartments, Park Avenue",
    },
  },
  {
    id: 1003,
    type: "Fraud",
    location: "Business District",
    reporter: "Mike Wilson",
    contact: "9012345678",
    date: "2024-01-13",
    status: "Resolved",
    report:
      "Victim was duped into transferring funds via a fake investment scheme. Investigation led to arrest of suspect through digital evidence.",
    images: [
      "https://via.placeholder.com/150?text=Transaction+Screenshot",
      "https://via.placeholder.com/150?text=Suspect+Email",
    ],
    personDetails: {
      age: 38,
      gender: "Male",
      occupation: "Accountant",
      address: "77 Corporate Lane, Business District",
    },
  },
  {
    id: 1004,
    type: "Vandalism",
    location: "School Zone",
    reporter: "Lisa Brown",
    contact: "8987654321",
    date: "2024-01-12",
    status: "Under Investigation",
    report:
      "Graffiti and damage were reported on the outer school walls. Suspect was seen fleeing on a bicycle by a nearby resident.",
    images: [
      "https://via.placeholder.com/150?text=Wall+Damage",
      "https://via.placeholder.com/150?text=Graffiti",
    ],
    personDetails: {
      age: 35,
      gender: "Female",
      occupation: "Principal",
      address: "23 School Street, Zone B",
    },
  },
  {
    id: 1005,
    type: "Theft",
    location: "Shopping Mall",
    reporter: "David Lee",
    contact: "9871122334",
    date: "2024-01-11",
    status: "Reported",
    report:
      "Mobile phone stolen from food court area. CCTV footage requested from mall authorities for further investigation.",
    images: [
      "https://via.placeholder.com/150?text=Lost+Phone",
      "https://via.placeholder.com/150?text=Mall+CCTV",
    ],
    personDetails: {
      age: 31,
      gender: "Male",
      occupation: "Engineer",
      address: "101 River View, Tech Valley",
    },
  },
  {
    id: 1006,
    type: "Assault",
    location: "Residential Area",
    reporter: "Emma Davis",
    contact: "9001234567",
    date: "2024-01-10",
    status: "Resolved",
    report:
      "Dispute between neighbors turned violent. FIR registered and resolved after counseling and mutual agreement.",
    images: [
      "https://via.placeholder.com/150?text=Dispute+Photo",
      "https://via.placeholder.com/150?text=Medical+Note",
    ],
    personDetails: {
      age: 40,
      gender: "Female",
      occupation: "Bank Manager",
      address: "Apt 56, Green Towers, West Lane",
    },
  },
  {
    id: 1007,
    type: "Fraud",
    location: "Bank Street",
    reporter: "Robert Taylor",
    contact: "9898989898",
    date: "2024-01-09",
    status: "Under Investigation",
    report:
      "Caller posing as bank representative collected OTP and withdrew money online. Account temporarily frozen by bank.",
    images: [
      "https://via.placeholder.com/150?text=Call+Log",
      "https://via.placeholder.com/150?text=Fraud+SMS",
    ],
    personDetails: {
      age: 45,
      gender: "Male",
      occupation: "Retired",
      address: "67 Silver Home, Bank Street",
    },
  },
  {
    id: 1008,
    type: "Vandalism",
    location: "Public Park",
    reporter: "Jennifer White",
    contact: "9022334455",
    date: "2024-01-08",
    status: "Reported",
    report:
      "Benches and play equipment damaged overnight. Evidence handed to municipal authorities for review.",
    images: [
      "https://via.placeholder.com/150?text=Broken+Bench",
      "https://via.placeholder.com/150?text=Park+Fence",
    ],
    personDetails: {
      age: 36,
      gender: "Female",
      occupation: "Architect",
      address: "55 Oak Grove, Cityside",
    },
  },
];

const mockUsers = [
  {
    name: "John Smith",
    email: "john.smith@email.com",
    phone: "+1-555-0101",
    registrationDate: "2023-06-15",
    status: "Active",
  },
  {
    name: "Sarah Johnson",
    email: "sarah.j@email.com",
    phone: "+1-555-0102",
    registrationDate: "2023-07-20",
    status: "Active",
  },
  {
    name: "Mike Wilson",
    email: "mike.wilson@email.com",
    phone: "+1-555-0103",
    registrationDate: "2023-08-10",
    status: "Suspended",
  },
  {
    name: "Lisa Brown",
    email: "lisa.brown@email.com",
    phone: "+1-555-0104",
    registrationDate: "2023-09-05",
    status: "Active",
  },
  {
    name: "David Lee",
    email: "david.lee@email.com",
    phone: "+1-555-0105",
    registrationDate: "2023-10-12",
    status: "Active",
  },
  {
    name: "Emma Davis",
    email: "emma.davis@email.com",
    phone: "+1-555-0106",
    registrationDate: "2023-11-18",
    status: "Active",
  },
  {
    name: "Robert Taylor",
    email: "robert.t@email.com",
    phone: "+1-555-0107",
    registrationDate: "2023-12-03",
    status: "Suspended",
  },
  {
    name: "Jennifer White",
    email: "jennifer.w@email.com",
    phone: "+1-555-0108",
    registrationDate: "2024-01-08",
    status: "Active",
  },
];

const mockOfficers = [
  {
    badge: "B001",
    name: "Officer Smith",
    rank: "Sergeant",
    department: "Patrol",
    status: "On Duty",
    image: "policeman_5600529.png",
    casesSolved: 42,
    currentCase: "FIR #1001",
    location: "Downtown Station",
    policeDepartment: "Central Police Department",
    phone: "+1-555-1001",
    email: "smith@police.gov",
    yearsOfService: 12,
  },
  {
    badge: "B002",
    name: "Officer Johnson",
    rank: "Constable",
    department: "Investigation",
    status: "Off Duty",
    image: "policeman_5600529.png",
    casesSolved: 28,
    currentCase: "FIR #1002",
    location: "West End Station",
    policeDepartment: "Westside Police Department",
    phone: "+1-555-1002",
    email: "johnson@police.gov",
    yearsOfService: 7,
  },
  {
    badge: "B003",
    name: "Officer Wilson",
    rank: "Inspector",
    department: "Traffic",
    status: "On Duty",
    image: "policeman_5600529.png",
    casesSolved: 35,
    currentCase: "FIR #1003",
    location: "East Precinct",
    policeDepartment: "Eastside Police Department",
    phone: "+1-555-1003",
    email: "wilson@police.gov",
    yearsOfService: 10,
  },
  {
    badge: "B004",
    name: "Officer Brown",
    rank: "Constable",
    department: "Patrol",
    status: "On Duty",
    image: "policeman_5600529.png",
    casesSolved: 20,
    currentCase: "FIR #1004",
    location: "North Station",
    policeDepartment: "Northside Police Department",
    phone: "+1-555-1004",
    email: "brown@police.gov",
    yearsOfService: 5,
  },
  {
    badge: "B005",
    name: "Officer Lee",
    rank: "Sergeant",
    department: "Investigation",
    status: "Off Duty",
    image: "policeman_5600529.png",
    casesSolved: 15,
    currentCase: "FIR #1005",
    location: "South Station",
    policeDepartment: "Southside Police Department",
    phone: "+1-555-1005",
    email: "lee@police.gov",
    yearsOfService: 8,
  },
  {
    badge: "B006",
    name: "Officer Davis",
    rank: "Constable",
    department: "Traffic",
    status: "On Duty",
    image: "policeman_5600529.png",
    casesSolved: 18,
    currentCase: "FIR #1006",
    location: "Central HQ",
    policeDepartment: "Central Police Department",
    phone: "+1-555-1006",
    email: "davis@police.gov",
    yearsOfService: 6,
  },
];

const mockLogs = [
  {
    timestamp: "2024-01-15 14:30:25",
    user: "admin",
    action: "User Login",
    type: "Login",
    level: "Info",
    details: "Successful login from IP 192.168.1.100",
  },
  {
    timestamp: "2024-01-15 14:25:10",
    user: "officer.smith",
    action: "FIR Access",
    type: "Data Access",
    level: "Info",
    details: "Accessed FIR #1001",
  },
  {
    timestamp: "2024-01-15 14:20:45",
    user: "system",
    action: "Database Backup",
    type: "System",
    level: "Info",
    details: "Automated backup completed successfully",
  },
  {
    timestamp: "2024-01-15 14:15:30",
    user: "admin",
    action: "User Creation",
    type: "Data Access",
    level: "Warning",
    details: "New user account created for john.doe",
  },
  {
    timestamp: "2024-01-15 14:10:15",
    user: "officer.johnson",
    action: "Case Update",
    type: "Data Access",
    level: "Info",
    details: "Updated status for Case #1002",
  },
  {
    timestamp: "2024-01-15 14:05:00",
    user: "system",
    action: "Login Failure",
    type: "Error",
    level: "Error",
    details: "Failed login attempt from IP 10.0.0.50",
  },
];

// Global Variables
let currentPage = 1;
const itemsPerPage = 10;
let currentSortColumn = -1;
let currentSortDirection = "asc";

// DOM Elements
const sidebar = document.getElementById("sidebar");
const mainContent = document.getElementById("mainContent");
const menuToggle = document.getElementById("menuToggle");

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
  initializeApp();
  populateTables();
  setupEventListeners();
  setupDateInputs();
});

function initializeApp() {
  // Set default dates
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const startDate = document.getElementById("startDate");
  const endDate = document.getElementById("endDate");

  if (startDate) startDate.value = thirtyDaysAgo.toISOString().split("T")[0];
  if (endDate) endDate.value = today.toISOString().split("T")[0];
}

function setupEventListeners() {
  // Menu toggle
  menuToggle.addEventListener("click", toggleSidebar);

  // Search functionality
  const firSearch = document.getElementById("firSearch");
  const userSearch = document.getElementById("userSearch");
  const logSearch = document.getElementById("logSearch");

  if (firSearch) firSearch.addEventListener("input", filterFIRs);
  if (userSearch) userSearch.addEventListener("input", filterUsers);
  if (logSearch) logSearch.addEventListener("input", filterLogs);

  // Filter functionality
  const statusFilter = document.getElementById("statusFilter");
  const typeFilter = document.getElementById("typeFilter");
  const userStatusFilter = document.getElementById("userStatusFilter");
  const logTypeFilter = document.getElementById("logTypeFilter");
  const logLevelFilter = document.getElementById("logLevelFilter");
  const logDateFilter = document.getElementById("logDateFilter");

  if (statusFilter) statusFilter.addEventListener("change", filterFIRs);
  if (typeFilter) typeFilter.addEventListener("change", filterFIRs);
  if (userStatusFilter)
    userStatusFilter.addEventListener("change", filterUsers);
  if (logTypeFilter) logTypeFilter.addEventListener("change", filterLogs);
  if (logLevelFilter) logLevelFilter.addEventListener("change", filterLogs);
  if (logDateFilter) logDateFilter.addEventListener("change", filterLogs);

  // Theme switcher
  const themeOptions = document.querySelectorAll(".theme-option");
  themeOptions.forEach((option) => {
    option.addEventListener("click", function () {
      themeOptions.forEach((opt) => opt.classList.remove("active"));
      this.classList.add("active");

      const theme = this.dataset.theme;
      if (theme === "dark") {
        document.body.classList.add("dark-theme");
      } else {
        document.body.classList.remove("dark-theme");
      }
    });
  });

  // Close modal when clicking outside
  window.addEventListener("click", (event) => {
    const modal = document.getElementById("confirmModal");
    if (event.target === modal) {
      closeModal();
    }
  });
}

function setupDateInputs() {
  const dateInputs = document.querySelectorAll('input[type="date"]');
  const today = new Date().toISOString().split("T")[0];

  dateInputs.forEach((input) => {
    if (!input.value) {
      input.value = today;
    }
  });
}

// Navigation Functions
// function toggleSidebar() {
//   sidebar.classList.toggle("open")
//   mainContent.classList.toggle("shifted")
// }

function showPage(pageId) {
  // Hide all pages
  const pages = document.querySelectorAll(".page");
  pages.forEach((page) => page.classList.remove("active"));

  // Show selected page
  const targetPage = document.getElementById(pageId);
  if (targetPage) {
    targetPage.classList.add("active");
  }

  // Update active menu item
  const menuItems = document.querySelectorAll(".menu-item");
  menuItems.forEach((item) => item.classList.remove("active"));

  const activeMenuItem = document.querySelector(`[data-page="${pageId}"]`);
  if (activeMenuItem) {
    activeMenuItem.classList.add("active");
  }

  // Close sidebar on mobile after navigation
  if (window.innerWidth <= 768) {
    sidebar.classList.remove("open");
    mainContent.classList.remove("shifted");
  }
}

// Table Population Functions
function populateTables() {
  populateFIRTable();
  populateUserTable();
  populateOfficerCards();
  populateLogTable();
}

function populateFIRTable() {
  const tbody = document.getElementById("firTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  mockFIRs.forEach((fir) => {
    const row = document.createElement("tr");
    row.innerHTML = `
            <td>#${fir.id}</td>
            <td>${fir.type}</td>
            <td>${fir.location}</td>
            <td>${fir.reporter}</td>
            <td>${fir.date}</td>
            <td><span class="status-badge ${fir.status
              .toLowerCase()
              .replace(" ", "")}">${fir.status}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view" onclick="viewFIR(${
                      fir.id
                    })" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn edit" onclick="editFIR(${
                      fir.id
                    })" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteFIR(${
                      fir.id
                    })" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
    tbody.appendChild(row);
  });
}

function populateUserTable() {
  const tbody = document.getElementById("userTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = mockUsers.slice(startIndex, endIndex);

  paginatedUsers.forEach((user) => {
    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${user.phone}</td>
            <td>${user.registrationDate}</td>
            <td><span class="status-badge ${user.status.toLowerCase()}">${
      user.status
    }</span></td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view" onclick="viewUser('${
                      user.email
                    }')" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn edit" onclick="editUser('${
                      user.email
                    }')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <div class="toggle-switch">
                        <input type="checkbox" id="user-${user.email}" ${
      user.status === "Active" ? "checked" : ""
    } 
                               onchange="toggleUserStatus('${user.email}')">
                        <label for="user-${
                          user.email
                        }" class="toggle-label"></label>
                    </div>
                </div>
            </td>
        `;
    tbody.appendChild(row);
  });

  updatePaginationInfo();
}

function populateOfficerCards() {
  const container = document.getElementById("officerCardGrid");
  if (!container) return;
  container.innerHTML = "";
  mockOfficers.forEach((officer) => {
    const card = document.createElement("div");
    card.className = "officer-card";
    card.innerHTML = `
      <div class="officer-card-img-wrap">
        <img src="${
          officer.image
        }" alt="Officer Photo" class="officer-card-img" />
      </div>
      <div class="officer-card-info">
        <h4>${officer.name}</h4>
        <p><strong>Badge:</strong> ${officer.badge}</p>
        <span class="status-badge ${officer.status
          .toLowerCase()
          .replace(/\s/g, "")}">${officer.status}</span>
        <p><strong>Location:</strong> ${officer.location}</p>
        <p><strong>Department:</strong> ${officer.policeDepartment}</p>
        <button class="btn-secondary" onclick="viewOfficer('${
          officer.badge
        }')">View Details</button>
      </div>
    `;
    container.appendChild(card);
  });
}

function populateLogTable() {
  const tbody = document.getElementById("logTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  mockLogs.forEach((log) => {
    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${log.timestamp}</td>
            <td>${log.user}</td>
            <td>${log.action}</td>
            <td>${log.type}</td>
            <td><span class="status-badge ${log.level.toLowerCase()}">${
      log.level
    }</span></td>
            <td>
                <button class="btn-secondary" onclick="viewLogDetails('${
                  log.timestamp
                }')">
                    <i class="fas fa-info-circle"></i> Details
                </button>
            </td>
        `;
    tbody.appendChild(row);
  });
}

// Filter Functions
function filterFIRs() {
  const searchTerm = document.getElementById("firSearch").value.toLowerCase();
  const statusFilter = document.getElementById("statusFilter").value;
  const typeFilter = document.getElementById("typeFilter").value;

  const filteredFIRs = mockFIRs.filter((fir) => {
    const matchesSearch =
      fir.id.toString().includes(searchTerm) ||
      fir.reporter.toLowerCase().includes(searchTerm) ||
      fir.location.toLowerCase().includes(searchTerm);
    const matchesStatus = !statusFilter || fir.status === statusFilter;
    const matchesType = !typeFilter || fir.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  updateFIRTable(filteredFIRs);
}

function filterUsers() {
  const searchTerm = document.getElementById("userSearch").value.toLowerCase();
  const statusFilter = document.getElementById("userStatusFilter").value;

  const filteredUsers = mockUsers.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm) ||
      user.phone.includes(searchTerm);
    const matchesStatus = !statusFilter || user.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  updateUserTable(filteredUsers);
}

function filterLogs() {
  const searchTerm = document.getElementById("logSearch").value.toLowerCase();
  const typeFilter = document.getElementById("logTypeFilter").value;
  const levelFilter = document.getElementById("logLevelFilter").value;
  const dateFilter = document.getElementById("logDateFilter").value;

  const filteredLogs = mockLogs.filter((log) => {
    const matchesSearch =
      log.user.toLowerCase().includes(searchTerm) ||
      log.action.toLowerCase().includes(searchTerm);
    const matchesType = !typeFilter || log.type === typeFilter;
    const matchesLevel = !levelFilter || log.level === levelFilter;
    const matchesDate = !dateFilter || log.timestamp.startsWith(dateFilter);

    return matchesSearch && matchesType && matchesLevel && matchesDate;
  });

  updateLogTable(filteredLogs);
}

function updateFIRTable(data) {
  const tbody = document.getElementById("firTableBody");
  tbody.innerHTML = "";

  data.forEach((fir) => {
    const row = document.createElement("tr");
    row.innerHTML = `
            <td>#${fir.id}</td>
            <td>${fir.type}</td>
            <td>${fir.location}</td>
            <td>${fir.reporter}</td>
            <td>${fir.date}</td>
            <td><span class="status-badge ${fir.status
              .toLowerCase()
              .replace(" ", "")}">${fir.status}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view" onclick="viewFIR(${
                      fir.id
                    })" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn edit" onclick="editFIR(${
                      fir.id
                    })" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteFIR(${
                      fir.id
                    })" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
    tbody.appendChild(row);
  });
}

function updateUserTable(data) {
  const tbody = document.getElementById("userTableBody");
  tbody.innerHTML = "";

  data.forEach((user) => {
    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${user.phone}</td>
            <td>${user.registrationDate}</td>
            <td><span class="status-badge ${user.status.toLowerCase()}">${
      user.status
    }</span></td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn view" onclick="viewUser('${
                      user.email
                    }')" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn edit" onclick="editUser('${
                      user.email
                    }')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <div class="toggle-switch">
                        <input type="checkbox" id="user-${user.email}" ${
      user.status === "Active" ? "checked" : ""
    } 
                               onchange="toggleUserStatus('${user.email}')">
                        <label for="user-${
                          user.email
                        }" class="toggle-label"></label>
                    </div>
                </div>
            </td>
        `;
    tbody.appendChild(row);
  });
}

function updateLogTable(data) {
  const tbody = document.getElementById("logTableBody");
  tbody.innerHTML = "";

  data.forEach((log) => {
    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${log.timestamp}</td>
            <td>${log.user}</td>
            <td>${log.action}</td>
            <td>${log.type}</td>
            <td><span class="status-badge ${log.level.toLowerCase()}">${
      log.level
    }</span></td>
            <td>
                <button class="btn-secondary" onclick="viewLogDetails('${
                  log.timestamp
                }')">
                    <i class="fas fa-info-circle"></i> Details
                </button>
            </td>
        `;
    tbody.appendChild(row);
  });
}

// Sorting Functions
function sortTable(tableId, columnIndex) {
  const table = document.getElementById(tableId);
  const tbody = table.querySelector("tbody");
  const rows = Array.from(tbody.querySelectorAll("tr"));

  // Determine sort direction
  if (currentSortColumn === columnIndex) {
    currentSortDirection = currentSortDirection === "asc" ? "desc" : "asc";
  } else {
    currentSortDirection = "asc";
    currentSortColumn = columnIndex;
  }

  // Sort rows
  rows.sort((a, b) => {
    const aValue = a.cells[columnIndex].textContent.trim();
    const bValue = b.cells[columnIndex].textContent.trim();

    // Handle numeric values
    if (!isNaN(aValue) && !isNaN(bValue)) {
      return currentSortDirection === "asc" ? aValue - bValue : bValue - aValue;
    }

    // Handle text values
    if (currentSortDirection === "asc") {
      return aValue.localeCompare(bValue);
    } else {
      return bValue.localeCompare(aValue);
    }
  });

  // Update table
  tbody.innerHTML = "";
  rows.forEach((row) => tbody.appendChild(row));

  // Update sort indicators
  const headers = table.querySelectorAll("th");
  headers.forEach((header, index) => {
    const icon = header.querySelector("i");
    if (icon) {
      if (index === columnIndex) {
        icon.className =
          currentSortDirection === "asc"
            ? "fas fa-sort-up"
            : "fas fa-sort-down";
      } else {
        icon.className = "fas fa-sort";
      }
    }
  });
}

// Pagination Functions
function changePage(direction) {
  const totalPages = Math.ceil(mockUsers.length / itemsPerPage);

  if (direction === 1 && currentPage < totalPages) {
    currentPage++;
  } else if (direction === -1 && currentPage > 1) {
    currentPage--;
  }

  populateUserTable();
}

function updatePaginationInfo() {
  const totalPages = Math.ceil(mockUsers.length / itemsPerPage);
  const pageInfo = document.getElementById("pageInfo");
  if (pageInfo) {
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  }
}

// Action Functions
function viewFIR(id) {
  const fir = mockFIRs.find((f) => f.id === id);
  if (!fir) {
    showModal("FIR Not Found", `No FIR found with ID #${id}`);
    return;
  }

  const person = fir.personDetails || {};
  const imageSection = fir.images?.length
    ? fir.images
        .map(
          (src) =>
            `<img src="${src}" style="width: 100px; margin-right: 10px; border-radius: 6px;" />`
        )
        .join("")
    : "No images provided.";

  const firDetails = `
    <div style="text-align:left; line-height: 1.6;">
      <strong>ID:</strong> #${fir.id}<br/>
      <strong>Type:</strong> ${fir.type}<br/>
      <strong>Location:</strong> ${fir.location}<br/>
      <strong>Date:</strong> ${fir.date}<br/>
      <strong>Status:</strong> ${fir.status}<br/>
      <strong>Reporter:</strong> ${fir.reporter}<br/>
      <strong>Contact:</strong> ${fir.contact || "N/A"}<br/><br/>

      <strong>Report:</strong><br/>
      <p>${fir.report || "No description provided."}</p>

      <strong>Person Details:</strong><br/>
      Age: ${person.age || "N/A"}<br/>
      Gender: ${person.gender || "N/A"}<br/>
      Occupation: ${person.occupation || "N/A"}<br/>
      Address: ${person.address || "N/A"}<br/><br/>

      <strong>Uploaded Images:</strong><br/>
      <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px;">
        ${imageSection}
      </div>
    </div>
  `;

  showModal("View FIR", firDetails, null, true);
}

function editFIR(id) {
  showModal("Edit FIR", `Edit FIR #${id}?`, () => {
    console.log(`Editing FIR ${id}`);
  });
}

function deleteFIR(id) {
  showModal("Delete FIR", `Are you sure you want to delete FIR #${id}?`, () => {
    console.log(`Deleting FIR ${id}`);
    // Remove from mock data and refresh table
    const index = mockFIRs.findIndex((fir) => fir.id === id);
    if (index > -1) {
      mockFIRs.splice(index, 1);
      populateFIRTable();
    }
  });
}

function viewUser(email) {
  showModal("View User", `Viewing details for user: ${email}`, () => {
    console.log(`Viewing user ${email}`);
  });
}

function editUser(email) {
  showModal("Edit User", `Edit user: ${email}?`, () => {
    console.log(`Editing user ${email}`);
  });
}

function toggleUserStatus(email) {
  const user = mockUsers.find((u) => u.email === email);
  if (user) {
    user.status = user.status === "Active" ? "Suspended" : "Active";
    populateUserTable();
  }
}

function viewOfficer(badge) {
  const officer = mockOfficers.find((o) => o.badge === badge);
  if (!officer) {
    showModal("Officer Not Found", `No officer found with badge ${badge}`);
    return;
  }
  const details = `
    <div style="text-align:left;line-height:1.6;">
      <img src="${officer.image}" alt="Officer Photo" style="width:100px;border-radius:8px;margin-bottom:10px;" /><br/>
      <strong>Name:</strong> ${officer.name}<br/>
      <strong>Badge ID:</strong> ${officer.badge}<br/>
      <strong>Rank:</strong> ${officer.rank}<br/>
      <strong>Department:</strong> ${officer.department}<br/>
      <strong>Police Department:</strong> ${officer.policeDepartment}<br/>
      <strong>Location:</strong> ${officer.location}<br/>
      <strong>Status:</strong> ${officer.status}<br/>
      <strong>Phone:</strong> ${officer.phone}<br/>
      <strong>Email:</strong> ${officer.email}<br/>
      <strong>Years of Service:</strong> ${officer.yearsOfService}<br/>
      <strong>Cases Solved:</strong> ${officer.casesSolved}<br/>
      <strong>Current Working Case:</strong> ${officer.currentCase}
    </div>
  `;
  showModal("Officer Details", details, null, true);
}

function editOfficer(badge) {
  showModal("Edit Officer", `Edit Officer ${badge}?`, () => {
    console.log(`Editing officer ${badge}`);
  });
}

function viewLogDetails(timestamp) {
  const log = mockLogs.find((l) => l.timestamp === timestamp);
  if (log) {
    showModal("Log Details", log.details, () => {
      console.log(`Viewing log details for ${timestamp}`);
    });
  }
}

// Modal Functions
function showModal(title, message, callback, isHtml) {
  const modal = document.getElementById("confirmModal");
  const modalTitle = document.getElementById("modalTitle");
  const modalMessage = document.getElementById("modalMessage");
  const confirmButton = document.getElementById("confirmButton");

  modalTitle.textContent = title;
  if (isHtml) {
    modalMessage.innerHTML = message;
  } else {
    modalMessage.textContent = message;
  }

  confirmButton.onclick = () => {
    if (callback) callback();
    closeModal();
  };

  modal.classList.add("show");
}

function closeModal() {
  const modal = document.getElementById("confirmModal");
  modal.classList.remove("show");
}

// Accordion Functions
function toggleAccordion(header) {
  const item = header.parentElement;
  const isActive = item.classList.contains("active");

  // Close all accordion items
  const allItems = document.querySelectorAll(".accordion-item");
  allItems.forEach((item) => item.classList.remove("active"));

  // Open clicked item if it wasn't active
  if (!isActive) {
    item.classList.add("active");
  }
}

// Form Validation
function validateForm(formElement) {
  const inputs = formElement.querySelectorAll(
    "input[required], select[required], textarea[required]"
  );
  let isValid = true;

  inputs.forEach((input) => {
    if (!input.value.trim()) {
      input.style.borderColor = "var(--danger)";
      isValid = false;
    } else {
      input.style.borderColor = "#d1d5db";
    }
  });

  return isValid;
}

// Event Handlers for Forms
document.addEventListener("submit", (e) => {
  if (e.target.classList.contains("ticket-form")) {
    e.preventDefault();

    if (validateForm(e.target)) {
      showModal("Success", "Support ticket submitted successfully!", () => {
        e.target.reset();
      });
    } else {
      showModal("Error", "Please fill in all required fields.");
    }
  }
});

// Responsive Sidebar Behavior
window.addEventListener("resize", () => {
  if (window.innerWidth > 768) {
    sidebar.classList.add("open");
    mainContent.classList.add("shifted");
  } else {
    sidebar.classList.remove("open");
    mainContent.classList.remove("shifted");
  }
});

// Initialize responsive behavior
if (window.innerWidth > 768) {
  sidebar.classList.add("open");
  mainContent.classList.add("shifted");
}

// Keyboard Shortcuts
document.addEventListener("keydown", (e) => {
  // Ctrl/Cmd + K to focus search
  if ((e.ctrlKey || e.metaKey) && e.key === "k") {
    e.preventDefault();
    const activeSearch = document.querySelector(
      ".page.active .search-bar input"
    );
    if (activeSearch) {
      activeSearch.focus();
    }
  }

  // Escape to close modal
  if (e.key === "Escape") {
    closeModal();
  }
});

// Auto-save functionality for forms
function setupAutoSave() {
  const forms = document.querySelectorAll("form");
  forms.forEach((form) => {
    const inputs = form.querySelectorAll("input, select, textarea");
    inputs.forEach((input) => {
      input.addEventListener("change", () => {
        // Simulate auto-save
        console.log("Auto-saving form data...");
      });
    });
  });
}

// Initialize auto-save
setupAutoSave();

// Performance monitoring
function logPerformance() {
  if (performance.mark) {
    performance.mark("app-loaded");
    console.log("Application loaded successfully");
  }
}

// Call performance logging
logPerformance();

// Emergency Services Data
const emergencyServices = [
  {
    name: "Police",
    number: "100",
    image: "policeman_5600529.png",
  },
  {
    name: "Ambulance",
    number: "108",
    image: "https://cdn-icons-png.flaticon.com/512/2967/2967350.png",
  },
  {
    name: "Fire Brigade",
    number: "101",
    image: "https://cdn-icons-png.flaticon.com/512/2967/2967360.png",
  },
  {
    name: "Disaster Management",
    number: "108",
    image: "https://cdn-icons-png.flaticon.com/512/2967/2967367.png",
  },
  {
    name: "Women Helpline",
    number: "1091",
    image: "https://cdn-icons-png.flaticon.com/512/2967/2967372.png",
  },
  {
    name: "Child Helpline",
    number: "1098",
    image: "https://cdn-icons-png.flaticon.com/512/2967/2967375.png",
  },
];

function populateEmergencyCards() {
  const grid = document.getElementById("emergencyCardGrid");
  if (!grid) return;
  grid.innerHTML = "";
  emergencyServices.forEach((service) => {
    const card = document.createElement("div");
    card.className = "emergency-card";
    card.innerHTML = `
      <div class="emergency-card-img-wrap">
        <img src="${service.image}" alt="${service.name}" class="emergency-card-img" />
      </div>
      <div class="emergency-card-info">
        <h4>${service.name}</h4>
        <div class="call-number">${service.number}</div>
        <a href="tel:${service.number}" class="btn-primary">Call</a>
      </div>
    `;
    grid.appendChild(card);
  });
}

// Notification Dropdown Logic
const notificationIcon = document.getElementById("notificationIcon");
const notificationDropdown = document.getElementById("notificationDropdown");
const mockNotifications = [
  "Urgent: High priority case requires immediate attention.",
  "System Update: Scheduled maintenance tonight at 2 AM.",
  "Meeting Reminder: Weekly briefing at 3 PM today.",
];

function populateNotifications() {
  if (!notificationDropdown) return;
  notificationDropdown.innerHTML = "";
  mockNotifications.forEach((note) => {
    const item = document.createElement("div");
    item.className = "notification-item";
    item.textContent = note;
    notificationDropdown.appendChild(item);
  });
}

if (notificationIcon) {
  notificationIcon.addEventListener("click", function (e) {
    e.stopPropagation();
    const isOpen = this.classList.contains("open");
    document
      .querySelectorAll(".notifications.open")
      .forEach((el) => el.classList.remove("open"));
    if (!isOpen) {
      this.classList.add("open");
      populateNotifications();
    }
  });
}
document.addEventListener("click", function (e) {
  if (notificationIcon && !notificationIcon.contains(e.target)) {
    notificationIcon.classList.remove("open");
  }
});

// Theme Switcher Logic
const themeOptions = document.querySelectorAll(".theme-option[data-theme]");
themeOptions.forEach((option) => {
  option.addEventListener("click", function () {
    themeOptions.forEach((opt) => opt.classList.remove("active"));
    this.classList.add("active");
    const theme = this.getAttribute("data-theme");
    if (theme === "dark") {
      document.body.classList.add("dark-theme");
    } else {
      document.body.classList.remove("dark-theme");
    }
  });
});

// Call populateEmergencyCards on DOMContentLoaded
const oldDOMContentLoaded = document.onreadystatechange || null;
document.addEventListener("DOMContentLoaded", () => {
  if (typeof oldDOMContentLoaded === "function") oldDOMContentLoaded();
  populateEmergencyCards();
});
