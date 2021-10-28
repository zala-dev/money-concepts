import { accounts } from "./data.js";
import {
  labelWelcome,
  labelDate,
  labelBalance,
  labelSumIn,
  labelSumOut,
  labelSumInterest,
  labelTimer,
  containerApp,
  containerMovements,
  btnTransfer,
  btnLogin,
  btnLoan,
  btnClose,
  btnSort,
  inputTransferTo,
  inputLoginPin,
  inputLoginUsername,
  inputTransferAmount,
  inputLoanAmount,
  inputCloseUsername,
  inputClosePin,
} from "./ui.js";

// Display welcome message
const displayWelcomeMessage = function (name) {
  const now = new Date();
  const greetings = new Map([
    [[6, 7, 8, 9, 10], "Good Morning"],
    [[11, 12, 13, 14], "Good Day"],
    [[15, 16, 17, 18], "Good Afternoon"],
    [[19, 20, 21, 22], "Good Evening"],
    [[23, 0, 1, 2, 3, 4, 5], "Good Night"],
  ]);

  const arr = [...greetings.keys()].find((key) => key.includes(now.getHours()));
  const greet = greetings.get(arr);
  labelWelcome.textContent = `${greet}, ${name}!`;
};

// Calculate Balance
const calcDisplayBalance = (acc) => {
  const balance = acc.movements.reduce((acc, mov) => acc + mov, 0);
  currentAccount.balance = balance;
  labelBalance.textContent = formatCur(balance, acc.locale, acc.currency);
};

// Calc summary
const calcDisplaySummary = function (acc) {
  const incomes = acc.movements
    .filter((mov) => mov > 0)
    .reduce((acc, mov) => acc + mov, 0);
  labelSumIn.textContent = formatCur(incomes, acc.locale, acc.currency);

  const out = Math.abs(
    acc.movements.filter((mov) => mov < 0).reduce((acc, mov) => acc + mov, 0)
  );
  labelSumOut.textContent = formatCur(out, acc.locale, acc.currency);

  const interest = acc.movements
    .filter((mov) => mov > 0)
    .map((deposit) => (deposit * acc.interestRate) / 100)
    .reduce((acc, mov) => acc + mov, 0);

  labelSumInterest.textContent = formatCur(interest, acc.locale, acc.currency);
};

// Format movement dates
const formatMovementDate = (date, locale) => {
  const calcDaysPassed = (date1, date2) =>
    Math.round(Math.round(Math.abs(date2 - date1) / (1000 * 60 * 60 * 24)));

  const daysPassed = calcDaysPassed(new Date(), date);

  if (daysPassed === 0) return "Today";
  if (daysPassed === 1) return "Yesterday";
  if (daysPassed <= 7) return `${daysPassed} days ago`;
  else {
    return new Intl.DateTimeFormat(locale).format(date);
  }
};

// Format currencies
const formatCur = (value, locale, currency) => {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
  }).format(value);
};

// Display movements
const displayMovements = function (acc, sort = false) {
  containerMovements.innerHTML = "";

  const movs = sort
    ? acc.movements.slice().sort((a, b) => a - b)
    : acc.movements;

  movs.forEach((mov, i) => {
    const type = mov > 0 ? "deposit" : "withdrawal";

    let displayDate = "";
    if (acc.movementsDates) {
      const date = new Date(acc.movementsDates[i]);

      displayDate = formatMovementDate(date, acc.locale);
    }

    const formattedMov = formatCur(mov, acc.locale, acc.currency);

    const html = `
    <div class="movements__row">
          <div class="movements__type movements__type--${type}">${
      i + 1
    } ${type}</div>
    <div class='movements__date'>${displayDate}</div>
          <div class="movements__value">${formattedMov}</div>
        </div>
    `;

    containerMovements.insertAdjacentHTML("afterbegin", html);
  });
};

// Compute Username
const createUsernames = function (accounts) {
  accounts.forEach((acc) => {
    acc.username = acc.owner
      .toLowerCase()
      .split(" ")
      .map((name) => name[0])
      .join("");
  });
};

createUsernames(accounts);

// Update UI
const updateUI = function (acc) {
  // Display movements
  displayMovements(acc);
  // Display balance
  calcDisplayBalance(acc);
  // Display summary
  calcDisplaySummary(acc);
};

// Logout timer
const startLogOutTimer = () => {
  const tick = function () {
    let min = String(Math.trunc(time / 60)).padStart(2, 0);
    let sec = String(time % 60).padStart(2, 0);

    // In each call, print the remaining time to UI
    labelTimer.textContent = `${min}:${sec}`;

    // When 0 seconds, stop timer and log out user
    if (time === 0) {
      clearInterval(timer);
      labelWelcome.textContent = `Log in to get started`;
      containerApp.style.opacity = 0;
    }

    // Decrease 1s
    time--;
  };

  // Set time to 2 minutes
  let time = 120;

  // Call the timer every second
  const timer = setInterval(tick, 1000);
  return timer;
};

/////////////////////////
// Event handlers
/////////////////////////
let currentAccount, timer;

// Login
btnLogin.addEventListener("click", function (e) {
  e.preventDefault();

  // Find the account
  currentAccount = accounts.find(
    (acc) => acc.username === inputLoginUsername.value
  );

  if (!currentAccount) {
    labelWelcome.textContent = `The account ${inputLoginUsername.value} doesn't exist`;
    inputLoginUsername.value = inputLoginPin.value = "";
    inputLoginUsername.focus();
  }

  if (currentAccount?.pin === Number(inputLoginPin.value)) {
    // Clear input fields
    inputLoginUsername.value = inputLoginPin.value = "";
    inputLoginPin.blur();
    // Display UI and message
    displayWelcomeMessage(`${currentAccount.owner.split(" ")[0]}`);

    containerApp.style.opacity = 1;
    document.querySelector(".login").style.display = "none";

    // Create current date and time
    const now = new Date();
    const options = {
      day: "numeric",
      month: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
      // weekday: "long",
    };
    const locale = currentAccount.locale;
    labelDate.textContent = new Intl.DateTimeFormat(locale, options).format(
      now
    );

    // Timer
    if (timer) clearInterval(timer);
    timer = startLogOutTimer();

    // Update UI
    updateUI(currentAccount);
  }
});

// Transfer
btnTransfer.addEventListener("click", function (e) {
  e.preventDefault();

  const amount = Number(inputTransferAmount.value);
  const receiverAcc = accounts.find(
    (acc) => acc.username === inputTransferTo.value
  );

  inputTransferAmount.value = inputTransferTo.value = "";

  if (
    amount > 0 &&
    receiverAcc &&
    currentAccount.balance >= amount &&
    receiverAcc?.username !== currentAccount.username
  ) {
    // Doing the transfer
    currentAccount.movements.push(-amount);
    receiverAcc.movements.push(amount);

    // Add transfer date
    currentAccount.movementsDates.push(new Date().toISOString());
    receiverAcc.movementsDates.push(new Date().toISOString());

    // Update UI
    updateUI(currentAccount);

    // Reset timer
    clearInterval(timer);
    timer = startLogOutTimer();
  }
});

// Request Loan
btnLoan.addEventListener("click", function (e) {
  e.preventDefault();
  const loanAmount = Math.floor(inputLoanAmount.value);
  if (
    loanAmount > 0 &&
    currentAccount.movements.some((mov) => mov >= loanAmount * 0.1)
  ) {
    setTimeout(() => {
      // Add movement
      currentAccount.movements.push(loanAmount);

      // Add loan date
      currentAccount.movementsDates.push(new Date().toISOString());

      // Update UI
      updateUI(currentAccount);

      // Reset timer
      clearInterval(timer);
      timer = startLogOutTimer();
    }, 2500);
  }

  inputLoanAmount.value = "";
});

// Close Account
btnClose.addEventListener("click", function (e) {
  e.preventDefault();

  currentAccount = accounts.find(
    (acc) => acc.username === inputCloseUsername.value
  );

  if (
    inputCloseUsername.value === currentAccount.username &&
    Number(inputClosePin.value) === currentAccount.pin
  ) {
    const index = accounts.findIndex(
      (acc) => acc.username === currentAccount.username
    );

    // Delete account
    accounts.splice(index, 1);

    // Hide UI
    containerApp.style.opacity = 0;
    document.querySelector(".login").style.display = "block";
    labelWelcome.textContent = "The account has been deleted successfully!";
    inputLoginUsername.focus();
    inputCloseUsername.value = inputClosePin.value = "";
  }
});

// Sorting
let sorted = false;

btnSort.addEventListener("click", () => {
  displayMovements(currentAccount, !sorted);
  sorted = !sorted;
});
