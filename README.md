# Smart Inventory & Workforce Management System

A full-stack web application designed to simplify day-to-day **inventory and business operations** in one place.

The system helps manage inventory, purchases, vendors, stock movements, requests, expenses, fuel records, reimbursements, and users through a centralized dashboard.

The project is also designed to grow into a complete **workforce management system**, where employee records, attendance, advances, wages, and payroll can be managed alongside inventory operations.

---

## About the Project

Managing inventory and operational records through spreadsheets or separate systems can become difficult as the amount of data grows.

This project provides a centralized platform where important business information can be recorded, managed, and tracked from a single application.

Instead of maintaining separate records for purchases, stock, vendors, expenses, fuel, and requests, everything is connected through one system.

The application focuses on keeping the interface simple and practical so that it can be used for real-world day-to-day operations.

---

## Features

### Inventory Management

- Manage inventory items and item types
- Track available stock
- Record stock movements
- Maintain stock ledger
- Perform stock adjustments
- Track inventory-related transactions
- Monitor inventory information

### Purchase Management

- Create and manage purchase records
- Manage purchase lots
- Associate purchases with vendors
- Upload purchase invoices
- Track purchase payments
- Settle purchase transactions

### Vendor Management

- Add and manage vendors
- Store vendor information
- Track vendor-related purchases
- View vendor records

### Requests Management

- Create item requests
- Track request status
- Manage pending requests
- Maintain request history

### Expense & Reimbursement Management

- Record reimbursements
- Manage expense information
- Track reimbursement status
- Maintain expense records

### Fuel Management

- Record fuel transactions
- Associate fuel records with vehicles
- Track fuel expenses
- Maintain fuel history

### User Management

- User authentication
- Admin and staff roles
- Protected routes
- User management
- Role-based access control

### Data Export

Important records can be exported to **Excel** for reporting, analysis, or external record keeping.

---

## Dashboard

The application provides a centralized dashboard for quickly accessing important parts of the system.

Instead of navigating through multiple separate tools, users can access inventory, vendors, purchases, requests, expenses, fuel, and administration from one application.

The dashboard can also be extended with additional business and workforce analytics as the system grows.

---

## Workforce Management

The project is designed to support workforce operations alongside inventory management.

The planned workforce functionality includes:

- Employee management
- Employee profiles
- Attendance tracking
- Employee advances
- Wage management
- Payroll
- Payment history
- Employee-related reports

This allows the system to eventually connect operational and workforce information in a single platform.

For example:

```text
Employee
   ↓
Attendance
   ↓
Wages
   ↓
Advances
   ↓
Payroll
   ↓
Payment
```

---

## Inventory Workflow

The inventory side of the application follows a connected workflow:

```text
Vendor
   ↓
Purchase
   ↓
Stock
   ↓
Stock Movement
   ↓
Inventory
   ↓
Requests / Expenses
```

This makes it easier to keep operational records connected rather than maintaining separate spreadsheets for every activity.

---

## Technology Stack

### Frontend

- React
- Vite
- JavaScript
- React Router
- CSS

### Backend

- Node.js
- Express.js
- REST API

### Database

- MongoDB

### Other Technologies

- Excel export
- File uploads
- Authentication
- Role-based access control
- API testing
- Frontend testing

---

## Project Structure

```text
smart-inventory-workforce/
│
├── backend/
│   ├── src/
│   ├── models/
│   ├── routes/
│   ├── controllers/
│   ├── middleware/
│   └── ...
│
├── frontend/
│   ├── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│   └── ...
│
├── docs/
│
└── README.md
```

The structure may evolve as additional workforce and reporting functionality is added.

---

## Getting Started

### Prerequisites

Make sure you have the following installed:

- Node.js
- npm
- MongoDB

### Clone the Repository

```bash
git clone <your-repository-url>
cd smart-inventory-workforce
```

### Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file and configure the required environment variables such as the database connection and authentication settings.

Start the backend:

```bash
npm start
```

### Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL shown by Vite in your browser.

---

## Testing

The project includes testing for both the backend and frontend.

Testing covers areas such as:

- API functionality
- Authentication
- Inventory workflows
- Frontend functionality
- Application builds

Additional tests will be added as new workforce and reporting functionality is integrated.

---

## Future Improvements

Some of the areas planned for further development include:

- Complete employee management
- Attendance management
- Employee advances
- Wage and payroll management
- Payment history
- Advanced reports
- Business analytics
- Dashboard charts
- More detailed role permissions
- Additional data export options
- Production deployment improvements

---

## Project Goal

The goal of this project is to build more than a basic inventory CRUD application.

It is designed as a connected business management platform where **inventory operations and workforce operations can work together**.

The long-term system will bring areas such as:

**Inventory + Purchases + Vendors + Expenses + Employees + Attendance + Payroll + Payments + Reports**

into one application.

---

## Author

**Rutvik Mevada**

B.Tech Computer Science & Engineering  
Parul University

---

## Project Status

The core inventory management functionality is currently implemented and functional.

The system is being expanded toward a complete inventory and workforce management platform.