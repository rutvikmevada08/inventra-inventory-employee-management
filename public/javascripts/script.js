// for Add Employee & Add Vendor 
function toggleForm(formId) {
    var form = document.getElementById(formId);
    var overlay = document.querySelector('.overlay');
    if (form.classList.contains('active')) {
      form.classList.remove('active');
      overlay.style.display = 'none';
    } else {
      closeAllForms();
      form.classList.add('active');
      overlay.style.display = 'block';
    }
  }
  
  function closeForms() {
    var overlay = document.querySelector('.overlay');
    overlay.style.display = 'none';
    closeAllForms();
  }
  
  function closeAllForms() {
    var forms = document.querySelectorAll('.form-container.active');
    forms.forEach(form => {
      form.classList.remove('active');
    });
  }
  
  function closeForm(formId) {
    var form = document.getElementById(formId);
    var overlay = document.querySelector('.overlay');
    form.classList.remove('active');
    overlay.style.display = 'none';
  }
  


// TOGGLE SIDEBAR
const menuBar = document.querySelector('#content nav .bx.bx-transfer-alt');
const sidebar = document.getElementById('sidebar');
const inventoryDashboardText = document.querySelector('#sidebar .brand .text');

menuBar.addEventListener('click', function () {
    sidebar.classList.toggle('hide');
    inventoryDashboardText.classList.toggle('hidden');
});


// Add product

let products = [];
let total = 0;
let rowCount = 0;

function addProduct() {
    const itemName = document.getElementById("itemNameInput").value;
    const price = parseFloat(document.getElementById("priceInput").value);
    const quantity = parseInt(document.getElementById("quantityInput").value);
    const totalAmount = price * quantity;

    if (!isNaN(totalAmount)) {
        rowCount++;
        const product = { itemName, price, quantity, totalAmount, id: rowCount };
        products.push(product);
        renderProduct(product);
        updateTotal();
        clearInputs();
    }
}

function renderProduct(product) {
    const tbody = document.getElementById("productsTableBody");
    const row = document.createElement("tr");
    row.innerHTML = `
    <td><input type="text" class="form-control" value="${product.itemName}" name="item_${product.id}_name" readonly/></td>
    <td><input type="text" class="form-control" value="${product.price}" name="item_${product.id}_price" readonly/></td>
    <td><input type="number" class="form-control" value="${product.quantity}" name="item_${product.id}_quantity" readonly/></td>
    <td><input type="text" class="form-control" value="${product.totalAmount}" name="item_${product.id}_amount" readonly/></td>
    <td><button type="button" class="btn btn-danger" onclick="removeProduct(${product.id})">Remove</button></td>
`;

    tbody.appendChild(row);
    let rows = $("#productsTableBody tr").length;
document.querySelector('#item_count').value = rows;

}

function removeProduct(id) {
    const index = products.findIndex(product => product.id === id);
    if (index !== -1) {
        products.splice(index, 1);
        const tbody = document.getElementById("productsTableBody");
        tbody.removeChild(tbody.childNodes[index]);
        updateTotal();
    }
}


function updateTotal() {
    total = products.reduce((acc, curr) => acc + curr.totalAmount, 0);
    document.getElementById("totalAmount").value = total;
}

function clearInputs() {
    document.getElementById("priceInput").value = "";
    document.getElementById("quantityInput").value = "";
    document.getElementById("totalInput").value = "";
}

function calculateAmount() {
    const price = parseFloat(document.getElementById("priceInput").value);
    const quantity = parseInt(document.getElementById("quantityInput").value);
    const totalAmount = price * quantity;
    document.getElementById("totalInput").value = isNaN(totalAmount) ? "" : totalAmount;
}

function complete() {
    alert("Inventory complete!");
}

//  show dashboard and add product


  function showDashboard() {
    document.getElementById("mainDashboard").style.display = "block";
    document.getElementById("addProductContainer").style.display = "none";
    document.getElementById("report").style.display = "none";
    document.getElementById("report").style.display = "none";
    document.getElementById("investerDetail").style.display = "none";

}

function showAddProduct() {
    document.getElementById("mainDashboard").style.display = "none";
    document.getElementById("addProductContainer").style.display = "block";
    document.getElementById("report").style.display = "none";
    document.getElementById("fuelDetail").style.display = "none";
    document.getElementById("investerDetail").style.display = "none";
}

function showReport() {
    document.getElementById("report").style.display = "block";
    document.getElementById("mainDashboard").style.display = "none";
    document.getElementById("addProductContainer").style.display = "none";
    document.getElementById("fuelDetail").style.display = "none";
    document.getElementById("investerDetail").style.display = "none";
}

function showFuel() {
  document.getElementById("mainDashboard").style.display = "none";
  document.getElementById("addProductContainer").style.display = "none";
  document.getElementById("report").style.display = "none";
  document.getElementById("fuelDetail").style.display = "block";
  document.getElementById("investerDetail").style.display = "none";

}

function showInvester() {
  document.getElementById("report").style.display = "none";
  document.getElementById("mainDashboard").style.display = "none";
  document.getElementById("addProductContainer").style.display = "none";
  document.getElementById("investerDetail").style.display = "block";
  document.getElementById("fuelDetail").style.display = "none";


}

// Function to toggle the visibility and state of the "Done" button for the "Invoice Number" section
function toggleInvoiceDoneButtonVisibility() {
    var doneBtn = document.getElementById('invoiceDoneBtn');
    var invoiceInputs = document.querySelectorAll('#invoiceSection input');
    var isEditable = false;

    // Check if any input field in the "Invoice Number" section is editable
    invoiceInputs.forEach(function(input) {
        if (!input.readOnly) {
            isEditable = true;
        }
    });

    // If any input field in the "Invoice Number" section is editable, display the "Done" button, otherwise hide it
    if (isEditable) {
        doneBtn.removeAttribute('disabled');
    } else {
        doneBtn.setAttribute('disabled', 'true');
    }
}

// Make fields uneditable on clicking the "Done" button for the "Invoice Number" section
document.getElementById('invoiceDoneBtn').addEventListener('click', function() {
    var invoiceInputs = document.querySelectorAll('#invoiceSection input');
    for (var i = 0; i < invoiceInputs.length; i++) {
        invoiceInputs[i].setAttribute('readonly', 'true');
    }
    document.getElementById('paidornot').setAttribute('disabled', 'true');
    toggleInvoiceDoneButtonVisibility(); 
});

// Make fields editable on clicking the "Edit" button for the "Invoice Number" section
document.getElementById('invoiceEditBtn').addEventListener('click', function() {
    var invoiceInputs = document.querySelectorAll('#invoiceSection input');
    for (var i = 0; i < invoiceInputs.length; i++) {
        invoiceInputs[i].removeAttribute('readonly');
    }
    document.getElementById('paidornot').removeAttribute('disabled');
    toggleInvoiceDoneButtonVisibility(); 
});

// Add input event listener to input fields within the "Invoice Number" section to update "Done" button 
var invoiceInputs = document.querySelectorAll('#invoiceSection input');
invoiceInputs.forEach(function(input) {
    input.addEventListener('input', toggleInvoiceDoneButtonVisibility);
});



// Function to toggle the visibility and state of the "Done" button for the "Fuel" section
function toggleFuelDoneButtonVisibility() {
    var doneBtn = document.getElementById('fuelDoneBtn');
    var fuelInputs = document.querySelectorAll('#fuelSection input');
    var isEditable = false;

    // Check if any input field in the "Fuel" section is editable
    fuelInputs.forEach(function(input) {
        if (!input.readOnly) {
            isEditable = true;
        }
    });

    // If any input field in the "Fuel" section is editable, display the "Done" button, otherwise hide it
    if (isEditable) {
        doneBtn.removeAttribute('disabled');
    } else {
        doneBtn.setAttribute('disabled', 'true');
    }
}

// Make fields uneditable on clicking the "Done" button for the "Fuel" section
document.getElementById('fuelDoneBtn').addEventListener('click', function() {
    var fuelInputs = document.querySelectorAll('#fuelSection input, #fuelSection select');
    for (var i = 0; i < fuelInputs.length; i++) {
        fuelInputs[i].setAttribute('readonly', 'true');
        fuelInputs[i].setAttribute('disabled', 'true');
    }
    document.getElementById('fuelDoneBtn').setAttribute('disabled', 'true');
    document.getElementById('fuelEditBtn').removeAttribute('disabled');
});


// Make fields editable on clicking the "Edit" button for the "Fuel" section
document.getElementById('fuelEditBtn').addEventListener('click', function() {
    var fuelInputs = document.querySelectorAll('#fuelSection input, #fuelSection select');
    for (var i = 0; i < fuelInputs.length; i++) {
        fuelInputs[i].removeAttribute('readonly');
        fuelInputs[i].removeAttribute('disabled');
    }
    document.getElementById('fuelDoneBtn').removeAttribute('disabled');
    document.getElementById('fuelEditBtn').setAttribute('disabled', 'true');
});


// Add input event listener to input fields within the "Fuel" section to update "Done" button 
var fuelInputs = document.querySelectorAll('#fuelSection input');
fuelInputs.forEach(function(input) {
    input.addEventListener('input', toggleFuelDoneButtonVisibility);
});



    // Get input fields
    const litresInput = document.getElementById('how_many_litre_item1');
    const costPerLitreInput = document.getElementById('costperlitre_item1');

    // Function to calculate total payable
    function calculateTotalPayable() {
        const litres = parseFloat(litresInput.value);
        const costPerLitre = parseFloat(costPerLitreInput.value);
        const totalPayable = litres * costPerLitre;

        // Update the total payable input field
        totalPayableInput.value = totalPayable.toFixed(2); 
    }

    // Add event listeners to trigger calculation
    litresInput.addEventListener('input', calculateTotalPayable);
    costPerLitreInput.addEventListener('input', calculateTotalPayable);










 // Allow only numbers for Total Payable, Total paid, costperunit, quantityInput
 var totalPayableInput = document.getElementById('totalPayable');
 var totalPaidInput = document.getElementById('totalPaid');
 var costperunitInput = document.getElementById('priceInput');
 var totalPayableInput = document.getElementById('total_payable_item1');
 var costperlitreInput = document.getElementById('costperlitre_item1');
 var quantityInput = document.getElementById('quantityInput');
 
 
 totalPayableInput.addEventListener('input', function(event) {
     this.value = this.value.replace(/[^0-9]/g, '');
 });
 
 totalPaidInput.addEventListener('input', function(event) {
     this.value = this.value.replace(/[^0-9]/g, '');
 });
 costperunitInput.addEventListener('input', function(event) {
     this.value = this.value.replace(/[^0-9]/g, '');
 });
 
 quantityInput.addEventListener('input', function(event) {
     this.value = this.value.replace(/[^0-9]/g, '');
 });
 costPerLitreInput.addEventListener('input', function(event) {
    this.value = this.value.replace(/[^0-9.]/g, '');

    // Ensure only one decimal point is present
    const parts = this.value.split('.');
    if (parts.length > 2) {
        // More than one decimal point found, keep only the first part
        this.value = parts.slice(0, -1).join('') + '.' + parts.slice(-1);
    }
});

totalPayableInput.addEventListener('input', function(event) {
    this.value = this.value.replace(/[^0-9]/g, '');
});
 




// Investment Details
let investors = [];
let investorCount = 0;

function addInvestor() {
    const whoPaid = document.getElementById("whoPaidInput").value;
    const toWhom = document.getElementById("toWhomInput").value;
    const date = document.getElementById("dateInput").value;
    const amount = parseFloat(document.getElementById("amountInput").value);
    const reason = document.getElementById("reasonInput").value;

    if (!isNaN(amount)) {
        investorCount++;
        const investor = { whoPaid, toWhom, date, amount, reason, id: investorCount };
        investors.push(investor);
        renderInvestor(investor);
        clearInvestorInputs();
    }
}

function renderInvestor(investor) {
    const tbody = document.getElementById("investorsTableBody");
    const row = document.createElement("tr");
    row.innerHTML = `
    <td><input type="text" class="form-control" value="${investor.whoPaid}" name="investor${investor.id}.whoPaid" readonly/></td>
    <td><input type="text" class="form-control" value="${investor.toWhom}" name="investor${investor.id}.toWhom" readonly/></td>
    <td><input type="date" class="form-control" value="${investor.date}" name="investor${investor.id}.date" readonly/></td>
    <td><input type="number" class="form-control" value="${investor.amount}" name="investor${investor.id}.amount" readonly/></td>
    <td><input type="text" class="form-control" value="${investor.reason}" name="investor${investor.id}.reason" readonly/></td>
    <td style="text-align: center;"><button class="btn btn-danger" onclick="removeInvestor(${investor.id})">Remove</button></td>
`;
    tbody.appendChild(row);
}

function removeInvestor(id) {
    const index = investors.findIndex(investor => investor.id === id);
    if (index !== -1) {
        investors.splice(index, 1);
        const tbody = document.getElementById("investorsTableBody");
        tbody.removeChild(tbody.childNodes[index]);
    }
}

function clearInvestorInputs() {
    document.getElementById("whoPaidInput").value = "";
    document.getElementById("toWhomInput").value = "";
    document.getElementById("dateInput").value = "";
    document.getElementById("amountInput").value = "";
    document.getElementById("reasonInput").value = "";
}














 // for Request Reimbursement & Request Item 
 function toggleForm(formId) {
    var form = document.getElementById(formId);
    var overlay = document.querySelector('.overlay');
    if (form.classList.contains('active')) {
      form.classList.remove('active');
      overlay.style.display = 'none';
    } else {
      closeAllForms();
      form.classList.add('active');
      overlay.style.display = 'block';
    }
  }
  
  function closeForms() {
    var overlay = document.querySelector('.overlay');
    overlay.style.display = 'none';
    closeAllForms();
  }
  
  function closeAllForms() {
    var forms = document.querySelectorAll('.form-container.active');
    forms.forEach(form => {
      form.classList.remove('active');
    });
  }
  
  function closeForm(formId) {
    var form = document.getElementById(formId);
    var overlay = document.querySelector('.overlay');
    form.classList.remove('active');
    overlay.style.display = 'none';
  }
  


// show Lot Form to add items

  function toggleLotSection() {
    var section = document.getElementById("lotSection");
    section.style.display = section.style.display === "none" ? "block" : "none";
  }




//   show specific Date

