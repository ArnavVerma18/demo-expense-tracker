
// ─── DIFFICULTY TOGGLE ───
var difficultyMode = 'normal';
var diffNormalBtn = document.getElementById('diffNormalBtn');
var diffHardBtn = document.getElementById('diffHardBtn');
var displayBaseIncome = document.getElementById('displayBaseIncome');

function setDifficulty(diff) {
  if (difficultyMode === diff) return;
  difficultyMode = diff;

  if (diff === 'hard') {
    BASE_INCOME = 5400;
    if (diffNormalBtn) diffNormalBtn.classList.remove('active');
    if (diffHardBtn) diffHardBtn.classList.add('active');
    showToast('Difficulty: Strict Poverty Line', 'Income capped at \u20b95,400 ($2.15/day)', false);
  } else {
    BASE_INCOME = 8000;
    if (diffHardBtn) diffHardBtn.classList.remove('active');
    if (diffNormalBtn) diffNormalBtn.classList.add('active');
    showToast('Difficulty: Standard Mode', 'Base income: \u20b98,000/mo', false);
  }

  if (isJobLossActive) {
    currentMonthIncome = Math.round(BASE_INCOME * 0.5);
  } else {
    currentMonthIncome = BASE_INCOME;
  }

  if (bannerIncomeAmount) bannerIncomeAmount.textContent = formatCurrency(currentMonthIncome);
  if (incomeSubnote) incomeSubnote.textContent = 'Base wage: ' + formatCurrency(currentMonthIncome) + '/month';
  if (displayBaseIncome) displayBaseIncome.textContent = formatCurrency(BASE_INCOME);

  recalculate();
}

/* ==========================================================================
   POVERTY BUDGET SIMULATOR - JAVASCRIPT
   SDG 1: No Poverty Interactive Simulation
   ========================================================================== */

// ─── CORE STATE VARIABLES ───
var INCOME = 8000;
var BASE_INCOME = 8000;
var currentMonthIncome = 8000;
var eventDeduction = 0;

var categories = ['rent', 'food', 'transport', 'medical', 'school'];
var sliders = {};
var valueLabels = {};

categories.forEach(function (cat) {
  sliders[cat] = document.getElementById(cat);
  valueLabels[cat] = document.getElementById(cat + 'Value');
});

// DOM Elements (Core)
var balanceAmountEl = document.getElementById('balanceAmount');
var balanceCard = document.getElementById('balanceCard');
var feedbackEl = document.getElementById('feedback');
var feedbackIcon = document.getElementById('feedbackIcon');
var feedbackText = document.getElementById('feedbackText');
var spentBarFill = document.getElementById('spentBarFill');
var eventDeductionEl = document.getElementById('eventDeduction');
var eventDeductionAmountEl = document.getElementById('eventDeductionAmount');

// ─── NEW STATE: MULTI-MONTH, DEBT, DEPENDENTS & CRISIS ───
var currentMonth = 1;
var MAX_MONTHS = 3;
var carriedDebt = 0;        // Carried over deficit + 5% interest
var carriedSavings = 0;     // Carried over surplus
var householdMode = 'self'; // 'self' or 'family'
var isJobLossActive = false;
var nextMonthJobLoss = false;
var monthHistory = [];      // Array of monthly financial logs
var hasShownNegativeModal = false;

// DOM Elements (New Features)
var currentMonthTag = document.getElementById('currentMonthTag');
var monthCycleSubtext = document.getElementById('monthCycleSubtext');
var carriedDebtPill = document.getElementById('carriedDebtPill');
var carriedDebtAmountEl = document.getElementById('carriedDebtAmount');
var carriedSavingsPill = document.getElementById('carriedSavingsPill');
var carriedSavingsAmountEl = document.getElementById('carriedSavingsAmount');
var debtInterestNotice = document.getElementById('debtInterestNotice');
var noticeDebtAmount = document.getElementById('noticeDebtAmount');

var bannerIncomeAmount = document.getElementById('bannerIncomeAmount');
var incomeSubnote = document.getElementById('incomeSubnote');
var incomeStatusBadge = document.getElementById('incomeStatusBadge');
var jobStatusBadge = document.getElementById('jobStatusBadge');
var spentLabel = document.getElementById('spentLabel');
var totalBudgetCap = document.getElementById('totalBudgetCap');

var dailyIncomeValue = document.getElementById('dailyIncomeValue');
var gaugeFill = document.getElementById('gaugeFill');
var gaugeVerdict = document.getElementById('gaugeVerdict');

var householdBadge = document.getElementById('householdBadge');
var depSelfBtn = document.getElementById('depSelfBtn');
var depFamilyBtn = document.getElementById('depFamilyBtn');

var negativeModalBackdrop = document.getElementById('negativeModalBackdrop');
var summaryModalBackdrop = document.getElementById('summaryModalBackdrop');

// Check sessionStorage for negative modal
if (sessionStorage.getItem('poverty_budget_negative_modal_shown') === 'true') {
  hasShownNegativeModal = true;
}

// ─── FORMATTING & UTILITIES ───
function formatCurrency(n) {
  var sign = n < 0 ? '-' : '';
  var abs = Math.abs(n);
  return sign + '\u20b9' + abs.toLocaleString('en-IN');
}

function updateSliderFill(slider) {
  var pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
  slider.style.setProperty('--fill', pct + '%');
}

// ─── RECALCULATE LOGIC ───
function recalculate() {
  var totalSpent = 0;
  categories.forEach(function (cat) {
    var val = parseInt(sliders[cat].value, 10) || 0;
    valueLabels[cat].textContent = formatCurrency(val);
    totalSpent += val;
    updateSliderFill(sliders[cat]);
  });

  // Effective available income this month
  var effectiveIncome = currentMonthIncome + carriedSavings;

  // Total expenditures = regular expenses + surprise life event + previous debt
  var totalOutgoings = totalSpent + eventDeduction + carriedDebt;
  var remaining = effectiveIncome - totalOutgoings;

  balanceAmountEl.textContent = formatCurrency(remaining);

  // Spent bar (relative to effective available funds)
  var cap = effectiveIncome > 0 ? effectiveIncome : 1;
  var spentPct = Math.min((totalOutgoings / cap) * 100, 100);
  spentBarFill.style.width = spentPct + '%';

  if (spentLabel) spentLabel.textContent = formatCurrency(totalOutgoings) + ' allocated';
  if (totalBudgetCap) totalBudgetCap.textContent = formatCurrency(effectiveIncome) + ' available';

  // Carried Debt & Savings display
  if (carriedDebt > 0) {
    if (carriedDebtPill) carriedDebtPill.style.display = 'inline-flex';
    if (carriedDebtAmountEl) carriedDebtAmountEl.textContent = formatCurrency(carriedDebt);
    if (debtInterestNotice) {
      debtInterestNotice.style.display = 'block';
      if (noticeDebtAmount) noticeDebtAmount.textContent = formatCurrency(carriedDebt);
    }
  } else {
    if (carriedDebtPill) carriedDebtPill.style.display = 'none';
    if (debtInterestNotice) debtInterestNotice.style.display = 'none';
  }

  if (carriedSavings > 0) {
    if (carriedSavingsPill) carriedSavingsPill.style.display = 'inline-flex';
    if (carriedSavingsAmountEl) carriedSavingsAmountEl.textContent = '+' + formatCurrency(carriedSavings);
  } else {
    if (carriedSavingsPill) carriedSavingsPill.style.display = 'none';
  }

  // Event deduction display
  if (eventDeduction > 0) {
    eventDeductionEl.style.opacity = '1';
    eventDeductionAmountEl.textContent = formatCurrency(eventDeduction);
  } else {
    eventDeductionEl.style.opacity = '0';
  }

  // Determine state & visual classes
  var state;
  if (remaining < 0) {
    state = 'red';
  } else if (remaining < 500) {
    state = 'orange';
  } else {
    state = 'green';
  }

  // Balance amount color
  balanceAmountEl.className = 'balance-amount state-' + state;

  // Spent bar color
  spentBarFill.className = 'spent-bar-fill state-' + state;

  // Feedback messaging
  feedbackEl.className = 'feedback ' + state;
  if (state === 'red') {
    feedbackIcon.innerHTML = '\u26a0\ufe0f';
    feedbackText.textContent = 'You\'re over budget by ' + formatCurrency(Math.abs(remaining)) + '. Cut expenses or this deficit will roll over as debt at +5% interest.';
    
    // Trigger shake animation on balance card
    if (balanceCard && !balanceCard.classList.contains('shake')) {
      balanceCard.classList.add('shake');
      setTimeout(function () {
        balanceCard.classList.remove('shake');
      }, 500);
    }

    // Check one-time negative balance educational modal
    checkAndTriggerNegativeModal();

  } else if (state === 'orange') {
    feedbackIcon.innerHTML = '\u26a1';
    feedbackText.textContent = 'Only ' + formatCurrency(remaining) + ' cushion left \u2014 a single health shock could push you into predatory debt.';
  } else {
    feedbackIcon.innerHTML = '\u2705';
    if (totalSpent === 0 && eventDeduction === 0 && carriedDebt === 0) {
      feedbackText.textContent = 'You haven\'t allocated anything yet. Adjust sliders to plan your month!';
    } else {
      feedbackText.textContent = formatCurrency(remaining) + ' surplus \u2014 this leftover amount will carry over as emergency savings next month.';
    }
  }

  // Update Daily Poverty Line Gauge
  updateDailyPovertyGauge();
}

// ─── DAILY INCOME VS WORLD BANK POVERTY LINE GAUGE ───
function updateDailyPovertyGauge() {
  var daily = Math.round(currentMonthIncome / 30);
  if (dailyIncomeValue) dailyIncomeValue.textContent = '\u20b9' + daily + ' / day';

  var POVERTY_LINE = 180; // $2.15/day ~ ₹180
  var MAX_SCALE = 350;
  var pct = Math.min(100, Math.max(0, (daily / MAX_SCALE) * 100));

  if (gaugeFill) {
    gaugeFill.style.width = pct + '%';
    if (daily < POVERTY_LINE) {
      gaugeFill.className = 'gauge-fill below-line';
    } else {
      gaugeFill.className = 'gauge-fill';
    }
  }

  if (gaugeVerdict) {
    if (daily < POVERTY_LINE) {
      gaugeVerdict.innerHTML = '&#9888; Simulated income is <strong>\u20b9' + daily + '/day</strong> &mdash; <span style="color:#ef4444;font-weight:700;">BELOW the World Bank Extreme Poverty Line of $2.15 (~&#8377;180/day)</span>. Severe deprivation!';
    } else {
      gaugeVerdict.innerHTML = 'Simulated income is <strong>\u20b9' + daily + '/day</strong> &mdash; currently above the <strong>&#8377;180/day ($2.15)</strong> extreme poverty line, but highly vulnerable.';
    }
  }
}

// ─── ONE-TIME FIRST NEGATIVE BALANCE MODAL ───
function checkAndTriggerNegativeModal() {
  if (!hasShownNegativeModal) {
    hasShownNegativeModal = true;
    try {
      sessionStorage.setItem('poverty_budget_negative_modal_shown', 'true');
    } catch (e) {}
    if (negativeModalBackdrop) {
      negativeModalBackdrop.classList.add('show');
    }
  }
}

function dismissNegativeModal() {
  if (negativeModalBackdrop) {
    negativeModalBackdrop.classList.remove('show');
  }
}

// ─── DEPENDENTS HOUSEHOLD MODE TOGGLE ───
function setHouseholdMode(mode) {
  if (householdMode === mode) return;
  householdMode = mode;

  var foodSlider = sliders['food'];
  var medSlider = sliders['medical'];
  var schoolSlider = sliders['school'];

  if (mode === 'family') {
    depSelfBtn.classList.remove('active');
    depFamilyBtn.classList.add('active');
    householdBadge.textContent = 'Family of 4';

    // Scale up Food, Medical, School max & values
    foodSlider.max = 12000;
    medSlider.max = 12000;
    schoolSlider.max = 10000;

    // Scale up current values by 1.6x if already set
    categories.forEach(function (cat) {
      if (cat === 'food' || cat === 'medical' || cat === 'school') {
        var currentVal = parseInt(sliders[cat].value, 10);
        if (currentVal > 0) {
          var newVal = Math.min(parseInt(sliders[cat].max, 10), Math.round((currentVal * 1.6) / 100) * 100);
          sliders[cat].value = newVal;
        }
      }
    });

  } else {
    depFamilyBtn.classList.remove('active');
    depSelfBtn.classList.add('active');
    householdBadge.textContent = '1 Person';

    // Reset max back to standard 8000
    foodSlider.max = 8000;
    medSlider.max = 8000;
    schoolSlider.max = 8000;

    categories.forEach(function (cat) {
      if (cat === 'food' || cat === 'medical' || cat === 'school') {
        var currentVal = parseInt(sliders[cat].value, 10);
        if (currentVal > 0) {
          var newVal = Math.min(8000, Math.round((currentVal / 1.6) / 100) * 100);
          sliders[cat].value = newVal;
        }
      }
    });
  }

  recalculate();
}

// ─── ATTACH SLIDER LISTENERS ───
categories.forEach(function (cat) {
  sliders[cat].addEventListener('input', recalculate);
});

// ─── RANDOM LIFE EVENTS (EXISTING FEATURE PRESERVED) ───
var lifeEvents = [
  { name: 'Child fell ill \u2014 doctor visit', min: 300, max: 1500 },
  { name: 'School uniform & books needed', min: 400, max: 1200 },
  { name: 'Roof leak \u2014 emergency repair', min: 500, max: 2000 },
  { name: 'Festival expenses', min: 200, max: 800 },
  { name: 'Phone broke \u2014 repair cost', min: 300, max: 1000 },
  { name: 'Relative\'s wedding contribution', min: 500, max: 1500 },
  { name: 'Cooking gas cylinder refill', min: 400, max: 900 },
  { name: 'Lost wallet with cash', min: 200, max: 600 },
  { name: 'Government ID renewal fees', min: 100, max: 500 },
  { name: 'Water tanker \u2014 supply shortage', min: 200, max: 700 },
  { name: 'Child needs spectacles', min: 300, max: 1000 },
  { name: 'Unexpected travel \u2014 family emergency', min: 500, max: 2000 },
];

var toastTimeout = null;

function showToast(title, amountStr, isWarning) {
  var toast = document.getElementById('eventToast');
  var toastName = document.getElementById('toastName');
  var toastCost = document.getElementById('toastCost');

  toastName.textContent = title;
  toastCost.textContent = amountStr;
  if (isWarning) {
    toastCost.style.color = '#fca5a5';
  } else {
    toastCost.style.color = '#86efac';
  }

  toast.classList.add('show');

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(function () {
    toast.classList.remove('show');
  }, 3500);
}

function triggerLifeEvent() {
  var event = lifeEvents[Math.floor(Math.random() * lifeEvents.length)];
  var cost = Math.round(
    (Math.random() * (event.max - event.min) + event.min) / 50
  ) * 50;

  eventDeduction += cost;
  recalculate();

  showToast(event.name, '\u2212' + formatCurrency(cost), true);

  // Button micro-animation
  var btn = document.getElementById('eventBtn');
  btn.style.transform = 'scale(0.97)';
  setTimeout(function () {
    btn.style.transform = '';
  }, 150);
}

// ─── RANDOM JOB-LOSS EVENT (NEW FEATURE) ───
function triggerJobLossEvent() {
  // Cuts income by 50% for next month and recalculates immediately
  nextMonthJobLoss = true;
  isJobLossActive = true;
  currentMonthIncome = Math.round(BASE_INCOME * 0.5); // ₹4,000

  // Update UI Elements
  if (bannerIncomeAmount) bannerIncomeAmount.textContent = formatCurrency(currentMonthIncome);
  if (incomeSubnote) incomeSubnote.textContent = 'Crisis Wage: \u20b94,000 (50% job cut applied)';
  if (incomeStatusBadge) {
    incomeStatusBadge.textContent = '\u26a0 Halved';
    incomeStatusBadge.style.color = '#ef4444';
    incomeStatusBadge.style.background = 'rgba(239, 68, 68, 0.1)';
  }
  if (jobStatusBadge) {
    jobStatusBadge.style.display = 'inline-flex';
    jobStatusBadge.textContent = '\u26a0 50% Wage Loss';
  }

  recalculate();

  showToast('Job Loss Crisis!', '\u221250% Income (Now ' + formatCurrency(currentMonthIncome) + ')', true);

  var btn = document.getElementById('jobLossBtn');
  if (btn) {
    btn.style.transform = 'scale(0.97)';
    setTimeout(function () {
      btn.style.transform = '';
    }, 150);
  }
}

// ─── NEXT MONTH BUTTON & DEBT WITH 5% INTEREST ───
function advanceToNextMonth() {
  // Calculate current month's financials
  var totalSpent = 0;
  var expenseBreakdown = {};
  categories.forEach(function (cat) {
    var val = parseInt(sliders[cat].value, 10) || 0;
    expenseBreakdown[cat] = val;
    totalSpent += val;
  });

  var effectiveIncome = currentMonthIncome + carriedSavings;
  var totalOutgoings = totalSpent + eventDeduction + carriedDebt;
  var remaining = effectiveIncome - totalOutgoings;

  // Record this month in history
  var monthRecord = {
    month: currentMonth,
    income: currentMonthIncome,
    totalSpent: totalOutgoings,
    remaining: remaining,
    debtFree: remaining >= 0,
    debtAccumulated: remaining < 0 ? Math.round(Math.abs(remaining) * 1.05) : 0,
    savingsCarried: remaining >= 0 ? remaining : 0,
    expenses: expenseBreakdown,
    eventDeduction: eventDeduction
  };
  monthHistory.push(monthRecord);

  // Carry over debt with 5% interest or carry over savings
  if (remaining < 0) {
    var newDebt = Math.round(Math.abs(remaining) * 1.05);
    carriedDebt = newDebt;
    carriedSavings = 0;
    showToast('Month ' + currentMonth + ' Closed in Deficit', 'Carried Debt: ' + formatCurrency(carriedDebt) + ' (+5% int.)', true);
  } else {
    carriedSavings = remaining;
    carriedDebt = 0;
    showToast('Month ' + currentMonth + ' Survived Debt-Free!', 'Saved: ' + formatCurrency(carriedSavings) + ' carried over', false);
  }

  // Check if we reached end of 3-month simulation
  if (currentMonth >= MAX_MONTHS) {
    showSummaryResultsModal();
    return;
  }

  // Advance Month counter
  currentMonth++;
  if (currentMonthTag) currentMonthTag.textContent = 'Month ' + currentMonth + ' of ' + MAX_MONTHS;
  if (monthCycleSubtext) monthCycleSubtext.textContent = 'Active Budget Cycle ' + currentMonth;

  // Reset Sliders
  categories.forEach(function (cat) {
    sliders[cat].value = 0;
  });

  // Reset surprise event deduction for new month
  eventDeduction = 0;

  // Apply or resolve job loss for next month
  if (nextMonthJobLoss) {
    currentMonthIncome = Math.round(BASE_INCOME * 0.5);
    nextMonthJobLoss = false;
  } else {
    currentMonthIncome = BASE_INCOME;
    isJobLossActive = false;
    if (jobStatusBadge) jobStatusBadge.style.display = 'none';
    if (incomeStatusBadge) {
      incomeStatusBadge.textContent = '\u25cf Fixed';
      incomeStatusBadge.style.color = '#10b981';
      incomeStatusBadge.style.background = 'rgba(16, 185, 129, 0.1)';
    }
  }

  if (bannerIncomeAmount) bannerIncomeAmount.textContent = formatCurrency(currentMonthIncome);
  if (incomeSubnote) incomeSubnote.textContent = 'Base wage: ' + formatCurrency(currentMonthIncome) + '/month';

  recalculate();

  // Scroll to simulator section gently
  var simSection = document.getElementById('simulatorSection');
  if (simSection) {
    simSection.scrollIntoView({ behavior: 'smooth' });
  }
}

// ─── 3-MONTH RESULTS SUMMARY CARD ───
function showSummaryResultsModal() {
  if (!summaryModalBackdrop) return;

  var debtFreeCount = 0;
  var totalDebtAccumulated = 0;
  var categoryTotals = {
    rent: 0,
    food: 0,
    transport: 0,
    medical: 0,
    school: 0
  };

  monthHistory.forEach(function (m) {
    if (m.debtFree) debtFreeCount++;
    totalDebtAccumulated += m.debtAccumulated;
    categories.forEach(function (cat) {
      categoryTotals[cat] += (m.expenses[cat] || 0);
    });
  });

  // Find biggest expense category
  var biggestCategory = 'rent';
  var biggestAmount = 0;
  categories.forEach(function (cat) {
    if (categoryTotals[cat] > biggestAmount) {
      biggestAmount = categoryTotals[cat];
      biggestCategory = cat;
    }
  });

  var categoryLabels = {
    rent: 'Rent \uD83C\uDFE0',
    food: 'Food \uD83C\uDF5A',
    transport: 'Transport \uD83D\uDE8C',
    medical: 'Medical \uD83D\uDC8A',
    school: 'School Fees \uD83D\uDCDA'
  };

  // Populate Summary Fields
  var summaryDebtFreeMonths = document.getElementById('summaryDebtFreeMonths');
  var summaryDebtFreeNote = document.getElementById('summaryDebtFreeNote');
  var summaryTotalDebt = document.getElementById('summaryTotalDebt');
  var summaryBiggestExpense = document.getElementById('summaryBiggestExpense');
  var summaryBiggestExpenseNote = document.getElementById('summaryBiggestExpenseNote');
  var breakdownTableBody = document.getElementById('breakdownTableBody');

  if (summaryDebtFreeMonths) {
    summaryDebtFreeMonths.textContent = debtFreeCount + ' / ' + MAX_MONTHS;
    if (debtFreeCount === 3) {
      summaryDebtFreeMonths.className = 'metric-value highlight-green';
      summaryDebtFreeNote.textContent = 'Outstanding resilience! All 3 months balanced.';
    } else if (debtFreeCount >= 1) {
      summaryDebtFreeMonths.className = 'metric-value highlight-blue';
      summaryDebtFreeNote.textContent = 'Survived with partial debt pressure.';
    } else {
      summaryDebtFreeMonths.className = 'metric-value highlight-red';
      summaryDebtFreeNote.textContent = 'Trapped in chronic deficit across all months.';
    }
  }

  if (summaryTotalDebt) {
    summaryTotalDebt.textContent = formatCurrency(totalDebtAccumulated);
  }

  if (summaryBiggestExpense) {
    summaryBiggestExpense.textContent = (categoryLabels[biggestCategory] || biggestCategory) + ' (' + formatCurrency(biggestAmount) + ')';
    if (summaryBiggestExpenseNote) {
      summaryBiggestExpenseNote.textContent = 'Accounted for the largest financial burden across 3 months';
    }
  }

  // Populate Breakdown Table
  if (breakdownTableBody) {
    breakdownTableBody.innerHTML = '';
    monthHistory.forEach(function (m) {
      var row = document.createElement('tr');
      var outcomeText = m.debtFree ? ('+' + formatCurrency(m.remaining) + ' surplus') : ('-' + formatCurrency(Math.abs(m.remaining)) + ' deficit');
      var outcomeColor = m.debtFree ? '#10b981' : '#ef4444';
      row.innerHTML = '<td>Month ' + m.month + '</td>' +
                      '<td>' + formatCurrency(m.income) + '</td>' +
                      '<td>' + formatCurrency(m.totalSpent) + '</td>' +
                      '<td style="color:' + outcomeColor + ';font-weight:700;">' + outcomeText + '</td>';
      breakdownTableBody.appendChild(row);
    });
  }

  summaryModalBackdrop.classList.add('show');
}

function closeSummaryModal() {
  if (summaryModalBackdrop) {
    summaryModalBackdrop.classList.remove('show');
  }
}

// ─── RESTART SIMULATION ───
function restartSimulation() {
  currentMonth = 1;
  carriedDebt = 0;
  carriedSavings = 0;
  monthHistory = [];
  eventDeduction = 0;
  isJobLossActive = false;
  nextMonthJobLoss = false;
  currentMonthIncome = BASE_INCOME;

  if (currentMonthTag) currentMonthTag.textContent = 'Month 1 of ' + MAX_MONTHS;
  if (monthCycleSubtext) monthCycleSubtext.textContent = 'Standard Budget Cycle';
  if (bannerIncomeAmount) bannerIncomeAmount.textContent = formatCurrency(BASE_INCOME);
  if (incomeSubnote) incomeSubnote.textContent = 'Base wage: ' + formatCurrency(BASE_INCOME) + '/month';
  if (jobStatusBadge) jobStatusBadge.style.display = 'none';
  if (incomeStatusBadge) {
    incomeStatusBadge.textContent = '\u25cf Fixed';
    incomeStatusBadge.style.color = '#10b981';
    incomeStatusBadge.style.background = 'rgba(16, 185, 129, 0.1)';
  }

  categories.forEach(function (cat) {
    sliders[cat].value = 0;
  });

  setHouseholdMode('self');
  closeSummaryModal();
  recalculate();

  var simSection = document.getElementById('simulatorSection');
  if (simSection) {
    simSection.scrollIntoView({ behavior: 'smooth' });
  }

  showToast('Simulation Reset', 'Month 1 started fresh', false);
}

// ─── INITIAL RENDER ───
recalculate();
