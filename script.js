var INCOME = 8000;
var eventDeduction = 0;

var categories = ['rent', 'food', 'transport', 'medical', 'school'];

var sliders = {};
var valueLabels = {};

categories.forEach(function (cat) {
  sliders[cat] = document.getElementById(cat);
  valueLabels[cat] = document.getElementById(cat + 'Value');
});

var balanceAmountEl = document.getElementById('balanceAmount');
var balanceCard = document.getElementById('balanceCard');
var feedbackEl = document.getElementById('feedback');
var feedbackIcon = document.getElementById('feedbackIcon');
var feedbackText = document.getElementById('feedbackText');
var spentBarFill = document.getElementById('spentBarFill');
var eventDeductionEl = document.getElementById('eventDeduction');
var eventDeductionAmountEl = document.getElementById('eventDeductionAmount');

function formatCurrency(n) {
  var sign = n < 0 ? '-' : '';
  var abs = Math.abs(n);
  return sign + '\u20b9' + abs.toLocaleString('en-IN');
}

function updateSliderFill(slider) {
  var pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
  slider.style.setProperty('--fill', pct + '%');
}

function recalculate() {
  var totalSpent = 0;
  categories.forEach(function (cat) {
    var val = parseInt(sliders[cat].value, 10);
    valueLabels[cat].textContent = formatCurrency(val);
    totalSpent += val;
    updateSliderFill(sliders[cat]);
  });

  totalSpent += eventDeduction;
  var remaining = INCOME - totalSpent;

  balanceAmountEl.textContent = formatCurrency(remaining);

  // Spent bar
  var spentPct = Math.min((totalSpent / INCOME) * 100, 100);
  spentBarFill.style.width = spentPct + '%';

  // Event deduction display
  if (eventDeduction > 0) {
    eventDeductionEl.style.opacity = '1';
    eventDeductionAmountEl.textContent = formatCurrency(eventDeduction);
  } else {
    eventDeductionEl.style.opacity = '0';
  }

  // Determine state
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

  // Feedback
  feedbackEl.className = 'feedback ' + state;
  if (state === 'red') {
    feedbackIcon.innerHTML = '\u26a0\ufe0f';
    feedbackText.textContent = 'You\'re over budget by ' + formatCurrency(Math.abs(remaining)) + '. Cut expenses or face debt.';
  } else if (state === 'orange') {
    feedbackIcon.innerHTML = '\u26a1';
    feedbackText.textContent = 'Only ' + formatCurrency(remaining) + ' left \u2014 one emergency could push you into crisis.';
  } else {
    feedbackIcon.innerHTML = '\u2705';
    feedbackText.textContent = formatCurrency(remaining) + ' remaining \u2014 budget looks manageable for now.';
  }
}

// Attach listeners
categories.forEach(function (cat) {
  sliders[cat].addEventListener('input', recalculate);
});

// Life events
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

function triggerLifeEvent() {
  var event = lifeEvents[Math.floor(Math.random() * lifeEvents.length)];
  var cost = Math.round(
    (Math.random() * (event.max - event.min) + event.min) / 50
  ) * 50;

  eventDeduction += cost;
  recalculate();

  // Show toast
  var toast = document.getElementById('eventToast');
  var toastName = document.getElementById('toastName');
  var toastCost = document.getElementById('toastCost');

  toastName.textContent = event.name;
  toastCost.textContent = '\u2212' + formatCurrency(cost);

  toast.classList.add('show');

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(function () {
    toast.classList.remove('show');
  }, 3000);

  // Button micro-animation
  var btn = document.getElementById('eventBtn');
  btn.style.transform = 'scale(0.97)';
  setTimeout(function () {
    btn.style.transform = '';
  }, 150);
}

// Initial render
recalculate();
