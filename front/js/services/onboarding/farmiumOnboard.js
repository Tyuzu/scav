// onboarding/farmiumOnboard.js
import { createElement } from "../../components/createElement.js";
import { Button } from "../../components/base/Button.js";
import Modal from "../../components/ui/Modal.mjs";

/**
 * Call Onboarding() to open the modal.
 * Saves final answers to localStorage key "farmiumOnboarding".
 */
export function Onboarding() {
  // skip if already completed
  const saved = localStorage.getItem("farmiumOnboarding");
  if (saved) return;

  // Stepper (segmented)
  function Stepper({ total, current }) {
    const wrap = createElement("div", {
      class: "stepper-wrap",
      role: "progressbar",
      "aria-valuemin": "1",
      "aria-valuemax": String(total),
      "aria-valuenow": String(current),
      style: "display:flex;gap:8px;margin-bottom:14px;"
    }, []);
    for (let i = 1; i <= total; i++) {
      const bg = i < current ? "#4caf50" : i === current ? "#1976d2" : "#e0e0e0";
      const stepEl = createElement("div", {
        class: `step-seg`,
        style: `flex:1; height:10px; border-radius:6px; background:${bg}; transition: background 220ms ease;`
      }, []);
      wrap.appendChild(stepEl);
    }
    return wrap;
  }

  // Create modal
  const modalEl = Modal({
    title: "Farmium Onboarding",
    size: "large",
    content: () => createElement("div", { id: "onboarding-container", class: "onboarding-box" }, []),
    closeOnOverlayClick: false
  });

  const container = modalEl.querySelector("#onboarding-container");
  container.innerHTML = "";

  // STATE
  const state = {
    step: 0,
    totalSteps: 0,
    path: "work",       // "work" or "hire"
    answers: {},        // collected answers
    history: [],        // stack of previous step functions for Back
    currentFn: null     // currently active step function
  };

  // HISTORY HELPERS
  function pushHistory(fn) {
    // store the function (not called) so goBack can re-render it
    if (typeof fn === "function") state.history.push(fn);
  }
  function goBack() {
    const prevFn = state.history.pop();
    if (!prevFn) return;
    // call previous function - it should set state.step appropriately
    state.currentFn = prevFn;
    prevFn();
  }

  // RENDER HELPERS
  function clearAndAppendStepper() {
    container.innerHTML = "";
    container.appendChild(Stepper({ total: state.totalSteps || 1, current: Math.max(1, state.step || 1) }));
  }

  function renderOptions({ title, options, onChoose, showBack = true }) {
    clearAndAppendStepper();
    container.appendChild(createElement("h2", {}, [title]));

    const optsWrap = createElement("div", { style: "display:flex;flex-direction:column;gap:8px;margin:12px 0;" }, []);
    Object.entries(options).forEach(([label, value]) => {
      const btn = Button(label, `btn-${label.replace(/\s+/g, "-").toLowerCase()}`, {
        click: () => {
          // push the current function so Back returns here
          if (state.currentFn) pushHistory(state.currentFn);
          onChoose(value);
        }
      }, "buttonx");
      optsWrap.appendChild(btn);
    });
    container.appendChild(optsWrap);

    if (showBack && state.history.length > 0) {
      const backBtn = Button("Back", "btn-back", { click: () => goBack() }, "button-back");
      container.appendChild(backBtn);
    }
  }

  // Map of named step functions for editing jump
  const stepNameMap = {
    choice: () => startStep(),
    // work steps
    days: () => workDaysStep(),
    type: () => workTypeStep(),
    shift: () => workShiftStep(),
    location: () => workLocationStep(),
    pay: () => workPayStep(),
    // hire steps
    hireType: () => hireWorkerTypeStep(),
    hireShift: () => hireShiftStep(),
    hirePay: () => hirePayStep(),
    hireLocation: () => hireLocationStep()
  };

  // Jump to edit a specific step from summary without resetting answers.
  // Push summaryStep so Back goes back to summary after editing.
  function editTo(stepKey) {
    const fn = stepNameMap[stepKey];
    if (!fn) return;
    // keep current summary reachable via Back
    pushHistory(summaryStep);
    state.currentFn = fn;
    fn();
  }

  // STEP FUNCTIONS
  function startStep() {
    state.currentFn = startStep;
    state.step = 1;
    renderOptions({
      title: "Do you want to Work or Hire?",
      options: { Work: "work", Hire: "hire" },
      onChoose: (choice) => {
        state.answers.choice = choice;
        state.path = choice;
        state.totalSteps = choice === "work" ? 6 : 5;
        // next step depends on path
        if (choice === "work") {
          state.currentFn = workDaysStep;
          state.step = 2;
          workDaysStep();
        } else {
          state.currentFn = hireWorkerTypeStep;
          state.step = 2;
          hireWorkerTypeStep();
        }
      },
      showBack: false
    });
  }

  // ---- Work path ----
  function workDaysStep() {
    state.currentFn = workDaysStep;
    state.step = 2;
    renderOptions({
      title: "How many days do you want to work?",
      options: {
        "1 Day": "1",
        "Few Days": "few",
        "Long Term": "long",
        "Weekend Only": "weekend"
      },
      onChoose: (val) => {
        state.answers.days = val;
        state.currentFn = workTypeStep;
        state.step = 3;
        workTypeStep();
      }
    });
  }

  function workTypeStep() {
    state.currentFn = workTypeStep;
    state.step = 3;
    renderOptions({
      title: "Select work type",
      options: {
        Kitchen: "kitchen",
        Delivery: "delivery",
        Cleaning: "cleaning",
        Retail: "retail",
        "Event Staff": "event"
      },
      onChoose: (val) => {
        state.answers.type = val;
        state.currentFn = workShiftStep;
        state.step = 4;
        workShiftStep();
      }
    });
  }

  function workShiftStep() {
    state.currentFn = workShiftStep;
    state.step = 4;
    renderOptions({
      title: "Preferred shift timing?",
      options: {
        Morning: "morning",
        Afternoon: "afternoon",
        Night: "night",
        Flexible: "flexible"
      },
      onChoose: (val) => {
        state.answers.shift = val;
        state.currentFn = workLocationStep;
        state.step = 5;
        workLocationStep();
      }
    });
  }

  function workLocationStep() {
    state.currentFn = workLocationStep;
    state.step = 5;
    renderOptions({
      title: "Preferred work location?",
      options: {
        "Near Me": "near",
        Remote: "remote",
        "Specific Area": "specific"
      },
      onChoose: (val) => {
        state.answers.location = val;
        state.currentFn = workPayStep;
        state.step = 6;
        workPayStep();
      }
    });
  }

  function workPayStep() {
    state.currentFn = workPayStep;
    state.step = 6;
    renderOptions({
      title: "What pay range are you expecting?",
      options: {
        "Below 1000/day": "low",
        "1000–2000/day": "medium",
        "2000+/day": "high"
      },
      onChoose: (val) => {
        state.answers.pay = val;
        state.step = state.totalSteps;
        summaryStep();
      }
    });
  }

  // ---- Hire path ----
  function hireWorkerTypeStep() {
    state.currentFn = hireWorkerTypeStep;
    state.step = 2;
    renderOptions({
      title: "What type of worker are you looking to hire?",
      options: {
        "Part-Time": "parttime",
        "Full-Time": "fulltime",
        Temporary: "temp"
      },
      onChoose: (val) => {
        state.answers.hireType = val;
        state.currentFn = hireShiftStep;
        state.step = 3;
        hireShiftStep();
      }
    });
  }

  function hireShiftStep() {
    state.currentFn = hireShiftStep;
    state.step = 3;
    renderOptions({
      title: "What shift do you need covered?",
      options: {
        Morning: "morning",
        Afternoon: "afternoon",
        Night: "night",
        Flexible: "flexible"
      },
      onChoose: (val) => {
        state.answers.shift = val;
        state.currentFn = hirePayStep;
        state.step = 4;
        hirePayStep();
      }
    });
  }

  function hirePayStep() {
    state.currentFn = hirePayStep;
    state.step = 4;
    renderOptions({
      title: "What pay range are you offering?",
      options: {
        Low: "low",
        Medium: "medium",
        High: "high"
      },
      onChoose: (val) => {
        state.answers.pay = val;
        state.currentFn = hireLocationStep;
        state.step = 5;
        hireLocationStep();
      }
    });
  }

  function hireLocationStep() {
    state.currentFn = hireLocationStep;
    state.step = 5;
    renderOptions({
      title: "Where is the job located?",
      options: {
        "Near Me": "near",
        Remote: "remote",
        "Specific Area": "specific"
      },
      onChoose: (val) => {
        state.answers.location = val;
        state.step = state.totalSteps;
        summaryStep();
      }
    });
  }

  // SUMMARY
  function summaryStep() {
    state.currentFn = summaryStep;
    state.step = state.totalSteps || 1;
    container.innerHTML = "";
    container.appendChild(Stepper({ total: state.totalSteps, current: state.step }));
    container.appendChild(createElement("h2", {}, ["Summary of your choices:"]));

    // build rows with Edit buttons that jump to single step
    const rows = [];

    function addRow(label, key, editKey) {
      const val = state.answers[key] ?? "—";
      const row = createElement("div", { style: "display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f7f7f7;" }, [
        createElement("div", {}, [createElement("strong", {}, [label + ": "]), ` ${val}`]),
        Button("Edit", `edit-${key}`, {
          click: () => {
            // edit specific step. push summary to history so Back returns here
            editTo(editKey || key);
          }
        }, "button-link")
      ]);
      rows.push(row);
    }

    if (state.path === "work") {
      addRow("Choice", "choice", "choice");
      addRow("Days", "days", "days");
      addRow("Type", "type", "type");
      addRow("Shift", "shift", "shift");
      addRow("Location", "location", "location");
      addRow("Pay", "pay", "pay");
    } else {
      addRow("Choice", "choice", "choice");
      addRow("Worker Type", "hireType", "hireType");
      addRow("Shift", "shift", "hireShift");
      addRow("Pay", "pay", "hirePay");
      addRow("Location", "location", "hireLocation");
    }

    const listWrap = createElement("div", { style: "margin:8px 0 18px 0;" }, rows);
    container.appendChild(listWrap);

    // Finish button
    const finishBtn = Button("Finish", "btn-finish", {
      click: () => {
        localStorage.setItem("farmiumOnboarding", JSON.stringify(state.answers));
        modalEl.remove();
      }
    }, "buttonx");
    container.appendChild(finishBtn);

    // Back to previous if history exists
    if (state.history.length > 0) {
      const backBtn = Button("Back", "btn-back", { click: () => goBack() }, "button-back");
      container.appendChild(backBtn);
    }
  }

  // START
  state.totalSteps = 1; // placeholder until path chosen
  startStep();
}
