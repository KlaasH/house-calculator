/* Super-fancy and overly complicated house cost calculator
 *
 * Written as an excercise while learning javascript, so leave your
 * judgy-boots at home.
 */


var PARAM_DEFAULTS = {
    "purchasePrice": 250000,
    "downPaymentPct": 20,
    "mortgageRate": 4,
    "mortgageTerm": 30,
    "yearsBeforeSelling": 8,
    "showEvery": 12,
    "oppCostRate": 5,
    "inflationRate": 2.5,
    "buyingCostPct": 3,
    "salesCostPct": 8,
    "realAppreciationRate": 0,
    "propTaxRate": 1.34,
    "propTaxExclAmt": 30000,
    "miscExpPct": 0,
    "miscExpAmt": 850,
};


/* A couple utility functions, found on the internet */

function dollarFormat(num) {
    var decimalSeparator = Number("1.2").toLocaleString().substr(1,1);
    var numWithCommas = num.toLocaleString();
    var splitNum = String(numWithCommas).split(decimalSeparator);
    var decPart = (splitNum.length > 1 ? 
        decimalSeparator + (splitNum[1] + "00").substr(0,2) : "");
    return "$" + splitNum[0] + decPart;
}

//ok actually I added some project-specific rewrites to this one
function toTitleCase(str) {
    var out = str.replace(/^[a-z]|[^\s][A-Z]/g, function(str, offset) {
        if (offset === 0) {
            return(str.toUpperCase());
        } else {
            return(str.substr(0,1) + " " + str.substr(1).toUpperCase());
        }
    });
    out = out.replace("Int Opp And", "Interest, Opportunity Cost, and");
    out = out.replace("Opp ", "Opportunity ");
    out = out.replace("Prop ", "Property ");
    out = out.replace(/Exp$/, "Expenses");

    return(out);
}


/* The code! */

function getParameters() {
    var params = {
        //input parameters
        purchasePrice: +$('#purchasePrice').val(),
        downPaymentPct: +$('#downPaymentPct').val(),
        mortgageRate: +$('#mortgageRate').val(),
        mortgageTerm: +$('#mortgageTerm').val(),
        yearsBeforeSelling: +$('#yearsBeforeSelling').val(),
        showEvery: +$('#showEvery').val(),
        oppCostRate: +$('#oppCostRate').val(),
        inflationRate: +$('#inflationRate').val(),
        buyingCostPct: +$('#buyingCostPct').val(),
        salesCostPct: +$('#salesCostPct').val(),
        realAppreciationRate: +$('#realAppreciationRate').val(),
        propTaxRate: +$('#propTaxRate').val(),
        propTaxExclAmt: +$('#propTaxExclAmt').val(),
        miscExpPct: +$('#miscExpPct').val() || 0,
        miscExpAmt: +$('#miscExpAmt').val() || 0
    };

    //derived parameters
    params.months = Math.round(params.yearsBeforeSelling * 12);
    params.downPaymentAmt = Math.round(params.purchasePrice * (params.downPaymentPct / 100));
    params.initialPrincipal = params.purchasePrice - params.downPaymentAmt;
    params.monthlyInterestRate = params.mortgageRate / 100 / 12;
    params.monthlyOppCostRate = params.oppCostRate / 100 / 12;
    params.monthlyInflationMultiple = 1 - (params.inflationRate / 100 / 12);
    params.propertyTaxAmount = Math.round(params.propTaxRate / 100 * (params.purchasePrice - params.propTaxExclAmt));

    return params;
}

function setPrefills() {
    var queryDict = {};
    location.search.substr(1).split("&").forEach(function(item) {
        queryDict[item.split("=")[0]] = item.split("=")[1];
    });
    for (var param in PARAM_DEFAULTS) {
        if (typeof queryDict[param] !== 'undefined') {
            $("#"+param).val(queryDict[param]);
        } else {
            $("#"+param).val(PARAM_DEFAULTS[param]);
            //overwrite the default mortgage rate with the current 30-year rate
            if(param === 'mortgageRate') {
                var url = 'https://www.quandl.com/api/v1/datasets/FMAC/FIX30YR?auth_token=3GruV2i6YikJcQaJM3gJ&rows=1&column=1';
                $.getJSON(url, function(data) {
                    $("#mortgageRate").val(data.data[0][1]);
                });
            }
        }
    }
}

//initialize form validation
function initializeValidation() {
    $('#house-calc-form').validate({
        errorPlacement: function(error, element) {
            //element.closest("li").find("label").after(error);
            element.closest("li").before(error);
        }
    });

    $('span.percent input').each(function() {
        $(this).rules('add', {
            required: true,
            number: true,
            min: 0,
            max: 100
        });
    });
    $('#oppCostRate').rules('remove', 'min');
    $('span.dollar input').each(function() {
        $(this).rules('add', {
            required: true,
            number: true,
            min: 0,
        });
    });
    $('span.years input').each(function() {
        $(this).rules('add', {
            required: true,
            number: true,
            min: 1,
        });
    });
    $('span.show-every input').each(function() {
        $(this).rules('add', {
            required: true,
            number: true,
            min: 1,
            max: 60,
        });
    });
}

function saveURL(params) {
    var url = location.pathname + "?";
    var terms = jQuery.map(PARAM_DEFAULTS, function (val, key) { 
        return key + '=' + params[key]; });
    return encodeURI(url + terms.join("&"));
}

function calculatePayment(month, initialPrincipal, monthlyInterestRate, mortgageTerm,
                          monthlyInflationMultiple) {
    if(month > mortgageTerm * 12) { 
        return 0;
    } else {
        return +(initialPrincipal * Math.pow(monthlyInflationMultiple, month) *
               (monthlyInterestRate + (monthlyInterestRate / 
               (Math.pow((1 + monthlyInterestRate), (mortgageTerm * 12)) - 1)))).toFixed(2);
    }
}

function compoundedRate(rate, month) {
    return Math.pow(1 + (rate / 100 / 12), month);
}

function Row(args) {
    this.month = args.month;
    this.params = args.params;
    this.payment = calculatePayment(args.month, this.params.initialPrincipal, 
        this.params.monthlyInterestRate, this.params.mortgageTerm, this.params.monthlyInflationMultiple);
    this.interest = args.interest;
    this.totalPrincipalPaid = args.totalPrincipalPaid;
    this.remainingPrincipal = args.remainingPrincipal;
    this.monthlyOppCost = args.monthlyOppCost;
    this.totalInterest = args.totalInterest;
    this.totalOppCost = args.totalOppCost;
    this.totalPropTax = args.totalPropTax;
    this.totalMiscExp = args.totalMiscExp;
}

Row.prototype = {
    constructor: Row,
    columns: ["month",
        "payment",
        "interest",
        "totalPrincipalPaid",
        "remainingPrincipal",
        "currentValue",
        "equity",
        "monthlyOppCost",
        "monthlyMiscExp",
        "monthlyAllCosts",
        "monthlyBill",
        "totalInterest",
        "totalOppCost",
        "totalPropTax",
        "totalMiscExp",
        "totalAllCosts",
        "salesCostPerMonth",
        "totalAppreciation",
        "finalMonthlyCost",
        "finalTotalCost"
    ],
    toArray: function () {
        var myArray = [];
        for(var i = 0; i <  this.columns.length; i++) {
            var colItem = this[this.columns[i]];
            myArray.push(typeof colItem === "function" ? colItem.apply(this) : colItem);
        }
        return myArray;
    },
    toString: function () { 
        var myStr = "";
        var myArray = this.toArray();
        for(var i = 0; i < myArray.length; i++) {
            myArray[i] = toTitleCase(this.columns[i]) + ": " + myArray[i];
        }
        return myArray.join(", ");
    },
    toRow: function () {
        var newRow = document.createElement("tr");
        var valArray = this.toArray();
        for (var i=0, l = valArray.length; i < l; i++) {
            var formattedVal = (i === 0 ? valArray[i] : dollarFormat(valArray[i]));
            newRow.insertCell(i).appendChild(document.createTextNode(formattedVal));
            newRow.cells[i].setAttribute("class", "house-calc");
        }
        newRow.cells[0].setAttribute("class", "house-calc month");
        return newRow;
    },
    appreciationFactor: function () {
        return compoundedRate(this.params.realAppreciationRate, this.month);
    },
    currentValue: function () {
        return Math.round(this.params.purchasePrice * this.appreciationFactor());
    },
    equity: function () {
        return this.currentValue() - this.remainingPrincipal;
    },
    propTax: function () {
        return +(this.params.propertyTaxAmount * this.appreciationFactor() / 12).toFixed(2);
    },
    monthlyMiscExp: function () {
        return +((this.params.miscExpAmt / 12 + this.currentValue() *
                  this.params.miscExpPct / 100 / 12).toFixed(2));
    },
    buyingCost: function () {
        return Math.round(this.params.buyingCostPct / 100 * this.params.purchasePrice);
    },
    monthlyAllCosts: function () {
        return +(this.interest + this.monthlyOppCost + this.propTax() + this.monthlyMiscExp());
    },
    monthlyBill: function () {
        return this.payment + this.propTax() + this.monthlyMiscExp();
    },
    totalAllCosts: function () {
        return this.totalInterest + this.totalOppCost + this.totalPropTax +
               this.totalMiscExp + this.buyingCost();
    },
    salesCostPerMonth: function () {
        return Math.round(this.currentValue() * (this.params.salesCostPct / 100 / this.month));
    },
    totalAppreciation: function () {
        return Math.round(this.equity() - this.totalPrincipalPaid);
    },
    finalMonthlyCost: function () {
        return Math.round(this.totalAllCosts() / this.month + this.salesCostPerMonth() - 
            (this.totalAppreciation() / this.month));
    },
    finalTotalCost: function () {
        return this.finalMonthlyCost() * this.month;
    },
};

var calculateRows = function(params) {
    var firstRow = new Row({month: 0, 
                     interest: 0, 
                     totalPrincipalPaid: params.downPaymentAmt,
                     remainingPrincipal: params.initialPrincipal,
                     monthlyOppCost: 0,
                     totalInterest: 0,
                     totalOppCost: 0,
                     totalPropTax: 0,
                     totalMiscExp: 0,
                     params: params,
    });
    firstRow.payment = 0;
    //This is month zero, i.e. closing day. So just buying costs.
    firstRow.monthlyMiscExp = function () { return 0; };
    firstRow.monthlyBill = function () { return 0; };
    firstRow.monthlyAllCosts = function () { return this.buyingCost(); };
    //And overload these because division by zero. Could also just blank them.
    firstRow.salesCostPerMonth = function () { return Math.round(params.purchasePrice *
                                                                (params.salesCostPct / 100)); };
    firstRow.totalAppreciation = function () { return 0; };
    firstRow.totalAllCosts = firstRow.monthlyAllCosts;
    firstRow.finalMonthlyCost = function () { return this.totalAllCosts() + this.salesCostPerMonth(); };
    firstRow.finalTotalCost = function () { return this.finalMonthlyCost(); };
    var rows = [firstRow];

    var totalPrincipalPaid;
    var interest;
    var payment;
    var monthlyOppCost;
    for(var m = 1; m <= params.months; m++) {
        interest = +(rows[m-1].remainingPrincipal * params.monthlyInflationMultiple *
            params.monthlyInterestRate).toFixed(2);
        payment = calculatePayment(m, params.initialPrincipal, 
            params.monthlyInterestRate, params.mortgageTerm, params.monthlyInflationMultiple);
        monthlyOppCost = +((rows[m-1].totalPrincipalPaid + rows[m-1].totalAllCosts()) *
                           params.monthlyOppCostRate).toFixed(2);
        totalPrincipalPaid = Math.round(rows[m-1].totalPrincipalPaid * 
            params.monthlyInflationMultiple + payment - interest);
        rows[m] = new Row({month: m,
                        interest: interest,
                        totalPrincipalPaid: totalPrincipalPaid,
                        remainingPrincipal: Math.round(rows[m-1].remainingPrincipal *
                                                       params.monthlyInflationMultiple -
                                                       (payment - interest)),
                        monthlyOppCost: monthlyOppCost,
                        totalInterest: Math.round(params.monthlyInflationMultiple *
                                                  rows[m-1].totalInterest + interest),
                        totalOppCost: Math.round(params.monthlyInflationMultiple *
                                                 rows[m-1].totalOppCost + monthlyOppCost),
                        totalPropTax: Math.round(params.monthlyInflationMultiple * rows[m-1].totalPropTax + 
                            (params.propertyTaxAmount * compoundedRate(params.realAppreciationRate, m) / 12)),
                        totalMiscExp: Math.round((params.miscExpAmt / 12) + 
                            (rows[m-1].currentValue() * params.miscExpPct / 100 / 12) +
                            params.monthlyInflationMultiple * rows[m-1].totalMiscExp),
                        params: params
                    });
    }
    return rows;
};

function makeHeaders() {
    var thead = document.createElement("thead");
    thead.setAttribute("class", "house-calc");
    var headerRow = document.createElement("tr");
    thead.appendChild(headerRow);
    for(var c = 0; c < Row.prototype.columns.length; c++) {
        var cell = document.createElement("th");
        cell.setAttribute("class", "house-calc");
        var title = toTitleCase(Row.prototype.columns[c]);
        cell.appendChild(document.createTextNode(title));
        headerRow.appendChild(cell);
    }
    return thead;
}

function makeTable(params, rows) {
    var table = document.createElement("table");
    table.setAttribute("id", "results-table");
    var tbody = document.createElement("tbody");
    for(var m = 0; m <= params.months; m += params.showEvery) {
        tbody.appendChild(rows[m].toRow());
    }
    table.appendChild(makeHeaders());
    table.appendChild(tbody);
    return table;
}

function makeSummary(items, title) {
    var summaryString = '<div class="summary results-box">\n<h3>' + title + '</h3>';
    for(var i=0; i < items.length; i += 2) {
        summaryString += items[i] + '<span class="amount">' + items[i+1] + '</span><br/>';
    }
    summaryString += "</div>";
    return $(summaryString);
}

function resultsSummary(params, rows) {
    var items = [
        "First month's mortgage payment: ", dollarFormat(rows[1].payment),
        "First month's mortgage + escrow: ", dollarFormat(rows[1].monthlyBill()),
        "First month's total costs: ", dollarFormat(rows[1].monthlyAllCosts()),
        "Last month's total costs: ", dollarFormat(rows[rows.length - 1].monthlyAllCosts()),
        "Final pre-sale total cost: ", dollarFormat(rows[rows.length - 1].totalAllCosts()),
        "Appreciation: ", 
            dollarFormat(Math.round((params.purchasePrice * 
            compoundedRate(params.realAppreciationRate, params.months)) - params.purchasePrice)) +
            " (" + dollarFormat(Math.round((params.purchasePrice *
            compoundedRate(params.realAppreciationRate + params.inflationRate, 
            params.months)) - params.purchasePrice)) +
            " nominal)",
        "Final post-sale total cost: ", dollarFormat(rows[rows.length - 1].finalTotalCost()),
        "Final post-sale monthly cost: ", dollarFormat(rows[rows.length - 1].finalMonthlyCost()),
    ];
    return makeSummary(items, "Summary");
}

function parameterSummary(params) {
    var items = [
        "Purchase price: ", dollarFormat(params.purchasePrice),
        "Down payment: ", params.downPaymentPct + "% (" + dollarFormat(params.downPaymentAmt) + ")",
        "Mortgage: ", params.mortgageTerm + " years, " + params.mortgageRate + "%",
        "Sell after: ", params.yearsBeforeSelling + " years",
        "Real opportunity cost rate: ", params.oppCostRate + "%",
        "Inflation rate: ", params.inflationRate + "%",
        "Transaction costs: ", params.buyingCostPct + "% buy, " + params.salesCostPct + "% sell",
        "Real appreciation rate: ", params.realAppreciationRate + "%",
        "Property tax: ", dollarFormat(params.propertyTaxAmount) + " (" + params.propTaxRate + "%, " + 
            dollarFormat(params.propTaxExclAmt) + " excl)",
        "Misc expenses: ", params.miscExpPct + "% + " + dollarFormat(params.miscExpAmt),
    ];

    var link = '<a class="calc-permalink" target="_blank" href="' + saveURL(params) + '">[link]</a>';

    return makeSummary(items, "Parameters " + link);
}

/*For use on the table page*/
function setColumnCookie(colName) {
    var cookieText = $.cookie("hidden_columns");
    if(typeof cookieText === "undefined") {
        cookieText = colName + ",";
    } else if(!cookieText.contains(colName)) {        
        cookieText += colName + ",";
    }
    $.cookie("hidden_columns", cookieText, { expires: 90, path: "/" });
}

function clearColumnCookie(colName) {
    var cookieText = $.cookie("hidden_columns");
    if(typeof cookieText != "undefined") {
        cookieText = cookieText.replace(colName + ",", "");
    }
    $.cookie("hidden_columns", cookieText, { expires: 90, path: "/" });
}

function hideColumnsFromCookie() {
    var cookieText = $.cookie("hidden_columns");
    if(typeof cookieText !== "undefined") {
        hide = cookieText.split(",");
        for(var i = 0; i < hide.length; i++) {
            toggleColumn(hide[i]);
        }
    }
}

function toggleColumn(colName) {
    var header = $("th").filter(function() { return $(this).text() === toTitleCase(colName); });
    var box = $(".column-toggles");
    if(header.length > 1) {
        alert("There is a bug here. More than one column matches.");
    } else if(header.length === 1) {
        var index = $("th").index(header);
        if(header.is(":visible")) {
            if(box.is(":hidden")) {
                box.fadeIn();
            }
            $("tr").find("td:eq(" + index + "), th:eq(" + index + ")").fadeOut();
            box.append("<button class=\"toggle\">" + toTitleCase(colName) + "</button>");
            setColumnCookie(colName);
        } else {
            $("tr").find("td:eq(" + index + "), th:eq(" + index + ")").fadeIn();
            box.find("button").filter(function() { return $(this).text() === toTitleCase(colName); }).remove();
            clearColumnCookie(colName);
            if(box.find("button").length === 0) {
                box.fadeOut();
            }
        }
    }
}

/* Action! */

// The actual calculation, triggered by the form
function calculateHousingCost() {
    var params = getParameters();
    var rows = calculateRows(params);
    var summary = resultsSummary(params, rows);

    $('.results-summary').html(summary);
    $('.parameters-summary').html(parameterSummary(params));
    $('.column-toggles').replaceWith('<div class="column-toggles results-box"><h3>Show hidden columns</h3></div>');
    
    $('.results-table').html(makeTable(params, rows));

    $(".column-toggles").on("click", "button", function() { toggleColumn($(this).text()); });
    $("#results-table").on("click", "th", function() { toggleColumn($(this).text()); });

    hideColumnsFromCookie();
}

// Initialize the form
$(document).ready(function() {
    setPrefills();
    initializeValidation();

    // Attach listener to auto-calculate the down payment amount
    $("#downPaymentPct, #purchasePrice").on("keyup", function() { 
        var amt = Math.round($("#downPaymentPct").val() / 100 * $("#purchasePrice").val());
        if(isNaN(amt)) {
            $("#downPaymentAmt").val('');
        } else {
            $("#downPaymentAmt").val(amt);
        }
    });
    $("#downPaymentPct").trigger("keyup");
});
