// Discount calculator: sale price mode and percent-off mode.
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const store = {
    get(key) {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        return null;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        /* storage blocked: the choice just isn't remembered */
      }
    },
  };

  let currency = store.get("dc-currency") || "USD";
  let mode = "sale";
  let lastResultText = "";

  // "1,299.50" or "1 299.50" → 1299.5; empty → null; junk → NaN
  function parse(value) {
    const cleaned = String(value).replace(/[\s,]/g, "");
    if (cleaned === "") return null;
    return /^\d*\.?\d+$|^\d+\.$/.test(cleaned) ? parseFloat(cleaned) : NaN;
  }

  function money(n) {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency,
      currencyDisplay: currency === "PKR" ? "code" : "symbol",
    }).format(n);
  }

  function percent(n) {
    const rounded = Math.round(n * 100) / 100;
    return rounded.toLocaleString(undefined, { maximumFractionDigits: 2 }) + "%";
  }

  function currencySymbol() {
    const part = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency,
      currencyDisplay: currency === "PKR" ? "code" : "symbol",
    })
      .formatToParts(0)
      .find((p) => p.type === "currency");
    return part ? part.value : currency;
  }

  function setError(fieldId, message) {
    const field = $(fieldId);
    let el = field.querySelector(".error");
    const input = field.querySelector("input");
    if (!message) {
      field.classList.remove("has-error");
      if (el) el.remove();
      input.removeAttribute("aria-invalid");
      return;
    }
    if (!el) {
      el = document.createElement("p");
      el.className = "error";
      el.id = fieldId + "-error";
      field.appendChild(el);
    }
    el.textContent = message;
    field.classList.add("has-error");
    input.setAttribute("aria-invalid", "true");
    input.setAttribute("aria-describedby", el.id);
  }

  function showEmpty(message) {
    $("tag").classList.add("is-empty");
    $("tag-label").textContent = mode === "sale" ? "You pay" : "Percent off";
    $("tag-price").textContent = "–";
    $("tag-was").textContent = message;
    $("tag-save").hidden = true;
    $("tag-lines").innerHTML = "";
    lastResultText = "";
  }

  function render({ label, big, was, save, lines, text }) {
    const tag = $("tag");
    const changed = $("tag-price").textContent !== big;
    tag.classList.remove("is-empty");
    $("tag-label").textContent = label;
    $("tag-price").textContent = big;
    $("tag-was").innerHTML = was;
    $("tag-save").textContent = save;
    $("tag-save").hidden = !save;
    $("tag-lines").innerHTML = lines
      .map(([k, v]) => `<li><span>${k}</span><span>${v}</span></li>`)
      .join("");
    lastResultText = text;
    if (changed) {
      tag.classList.remove("updated");
      void tag.offsetWidth; // restart the swing animation
      tag.classList.add("updated");
    }
  }

  function calcSale() {
    const price = parse($("price").value);
    const discount = parse($("discount").value);
    const extra = parse($("extra").value) || 0;
    const tax = parse($("tax").value) || 0;
    const type = $("discount-type").value;

    let ok = true;
    const check = (id, bad, message) => {
      setError(id, bad ? message : "");
      if (bad) ok = false;
    };

    check("f-price", Number.isNaN(price), "Enter the price as a number, like 49.99.");
    check(
      "f-discount",
      Number.isNaN(discount) ||
        (type === "percent" && discount > 100) ||
        (type === "amount" && price && discount > price),
      Number.isNaN(discount)
        ? "Enter the discount as a number, like 20."
        : type === "percent"
          ? "A discount can't be more than 100%."
          : "The amount off can't be more than the price."
    );
    check("f-extra", Number.isNaN(parse($("extra").value)) || extra > 100, "Enter an extra discount from 0 to 100.");
    check("f-tax", Number.isNaN(parse($("tax").value)), "Enter the tax rate as a number, like 8.25.");

    if (!ok) return showEmpty("Fix the highlighted field to see your price.");
    if (price === null || price === 0) return showEmpty("Enter a price to see the sale price.");

    const afterFirst = type === "percent" ? price * (1 - (discount || 0) / 100) : price - (discount || 0);
    const afterExtra = afterFirst * (1 - extra / 100);
    const taxAmount = afterExtra * (tax / 100);
    const total = afterExtra + taxAmount;
    const saved = price - afterExtra;
    const totalPct = (saved / price) * 100;

    const lines = [["Original price", money(price)]];
    if (type === "percent") lines.push([`Discount (${percent(discount || 0)})`, "−" + money(price - afterFirst)]);
    else lines.push(["Amount off", "−" + money(discount || 0)]);
    if (extra) lines.push([`Extra ${percent(extra)} off`, "−" + money(afterFirst - afterExtra)]);
    if (tax) {
      lines.push(["Price before tax", money(afterExtra)]);
      lines.push([`Sales tax (${percent(tax)})`, "+" + money(taxAmount)]);
    }

    render({
      label: tax ? "You pay, with tax" : "You pay",
      big: money(total),
      was: `Was <s>${money(price)}</s>`,
      save: saved > 0 ? `You save ${money(saved)} (${percent(totalPct)} off)` : "",
      lines: lines,
      text:
        `Original ${money(price)}, you pay ${money(total)}` +
        (saved > 0 ? `, you save ${money(saved)} (${percent(totalPct)} off)` : "") +
        ".",
    });
    syncChips();
  }

  function calcPercent() {
    const orig = parse($("orig").value);
    const sale = parse($("sale").value);

    let ok = true;
    if (Number.isNaN(orig)) {
      setError("f-orig", "Enter the original price as a number.");
      ok = false;
    } else setError("f-orig", "");
    if (Number.isNaN(sale) || (orig && sale > orig)) {
      setError("f-sale", Number.isNaN(sale) ? "Enter the sale price as a number." : "The sale price is higher than the original. Check the two prices.");
      ok = false;
    } else setError("f-sale", "");

    if (!ok) return showEmpty("Fix the highlighted field to see the percent off.");
    if (!orig || sale === null) return showEmpty("Enter both prices to see the percent off.");

    const saved = orig - sale;
    const pct = (saved / orig) * 100;
    render({
      label: "Percent off",
      big: percent(pct),
      was: `<s>${money(orig)}</s> → ${money(sale)}`,
      save: saved > 0 ? `You save ${money(saved)}` : "",
      lines: [
        ["Original price", money(orig)],
        ["Sale price", money(sale)],
        ["Amount saved", money(saved)],
      ],
      text: `${money(orig)} down to ${money(sale)} is ${percent(pct)} off. You save ${money(saved)}.`,
    });
  }

  function calculate() {
    if (mode === "sale") calcSale();
    else calcPercent();
  }

  function syncChips() {
    const isPercent = $("discount-type").value === "percent";
    const value = parse($("discount").value);
    document.querySelectorAll("#chips button").forEach((b) => {
      b.setAttribute("aria-pressed", String(isPercent && Number(b.dataset.value) === value));
    });
    $("chips").hidden = !isPercent;
  }

  function setMode(next, focusTab) {
    mode = next;
    const tabs = { sale: $("tab-sale"), percent: $("tab-percent") };
    Object.entries(tabs).forEach(([key, tab]) => {
      const active = key === next;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
      $(tab.getAttribute("aria-controls")).hidden = !active;
    });
    if (focusTab) tabs[next].focus();
    calculate();
  }

  function updateCurrency() {
    document.querySelectorAll(".currency-symbol").forEach((el) => {
      el.textContent = currencySymbol();
    });
    calculate();
    fillReferenceTable();
  }

  function fillReferenceTable() {
    const body = $("ref-table");
    if (!body) return;
    body.innerHTML = [5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 75, 80]
      .map((d) => `<tr><td>${d}% off</td><td>${money(d)}</td><td>${money(100 - d)}</td></tr>`)
      .join("");
  }

  // --- Wire up ---
  ["price", "discount", "extra", "tax", "orig", "sale"].forEach((id) => {
    $(id).addEventListener("input", calculate);
  });
  $("discount-type").addEventListener("change", calculate);

  $("chips").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    $("discount").value = btn.dataset.value;
    calculate();
  });

  $("tab-sale").addEventListener("click", () => setMode("sale"));
  $("tab-percent").addEventListener("click", () => setMode("percent"));
  document.querySelector(".modes").addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      setMode(mode === "sale" ? "percent" : "sale", true);
    }
  });

  const currencySelect = $("currency");
  if ([...currencySelect.options].some((o) => o.value === currency)) currencySelect.value = currency;
  else currency = currencySelect.value;
  currencySelect.addEventListener("change", () => {
    currency = currencySelect.value;
    store.set("dc-currency", currency);
    updateCurrency();
  });

  $("copy").addEventListener("click", async () => {
    const status = $("copy-status");
    if (!lastResultText) {
      status.textContent = "Nothing to copy yet. Enter a price first.";
      return;
    }
    try {
      await navigator.clipboard.writeText(lastResultText);
      status.textContent = "Copied.";
    } catch (e) {
      status.textContent = "Your browser blocked copying. Select the price and copy it by hand.";
    }
    setTimeout(() => (status.textContent = ""), 3000);
  });

  $("year").textContent = new Date().getFullYear();
  updateCurrency();
})();
