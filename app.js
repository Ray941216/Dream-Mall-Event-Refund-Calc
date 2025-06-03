// app.js
// ---------------------
// 1. 活動設定管理：使用 localStorage 存、取
// ---------------------
const STORAGE_KEY = 'activity_list';
let activityList = [];

// 從 localStorage 讀出（若無則預設空陣列）
function loadActivities() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
        try {
            activityList = JSON.parse(raw);
        } catch {
            activityList = [];
        }
    }

    if (activityList.length > 0) {
        for (let act = 0; act < activityList.length; act++) {
            if (activityList[act].N === Infinity || activityList[act].N === null || activityList[act].N === 0) {
                activityList[act].N = Infinity;
            }

        }
    }
}

// 將 activityList 寫回 localStorage
function saveActivities() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activityList));
}

// 新增一筆活動
function addActivity(C, R, N) {
    activityList.push({ C, R, N });
    saveActivities();
}

// 刪除一筆活動
function removeActivity(index) {
    activityList.splice(index, 1);
    saveActivities();
}

// 更新某筆活動（index）
function updateActivity(index, newC, newR, newN) {
    activityList[index] = { C: newC, R: newR, N: newN };
    saveActivities();
}

// ---------------------
// 2. 在畫面上渲染「活動清單」
// ---------------------

// Modal 初始化
document.addEventListener("DOMContentLoaded", () => {
    M.AutoInit();
    // 初始化 modal
    const modalElems = document.querySelectorAll(".modal");
    M.Modal.init(modalElems);
    // 初始化 collapsible
    const collElems = document.querySelectorAll('.collapsible');
    M.Collapsible.init(collElems);

    loadActivities();
    renderActivities();
});

const activityContainer = document.getElementById('activity-container');

function renderActivities() {
    activityContainer.innerHTML = '';
    activityList.forEach((act, idx) => {
        // 每筆活動以 Materialize Collection 顯示
        const li = document.createElement('li');
        li.className = 'collection-item';
        li.innerHTML = `
      <div>
        滿 <strong>${act.C}</strong> 元 回饋 <strong>${act.R}</strong> 元，
        日限 ${act.N === Infinity ? '無限' : act.N} 份
        <a href="#!" class="secondary-content">
          <i class="material-icons" data-action="edit" data-index="${idx}">edit</i>
          <i class="material-icons" data-action="delete" data-index="${idx}">delete</i>
        </a>
      </div>
    `;
        activityContainer.appendChild(li);
    });
}


// 取代 prompt 改用 modal 表單
let editIndex = null;

document.getElementById("add-activity-btn").addEventListener("click", () => {
    editIndex = null;
    document.getElementById("modal-title").innerText = "新增活動";
    clearModalInputs();
    M.Modal.getInstance(document.getElementById("modal-activity-form")).open();
});

activityContainer.addEventListener("click", e => {
    const el = e.target;
    if (!el.dataset.action) return;
    const idx = Number(el.dataset.index);
    if (el.dataset.action === "edit") {
        editIndex = idx;
        document.getElementById("modal-title").innerText = "編輯活動";
        fillModalInputs(activityList[idx]);
        M.Modal.getInstance(document.getElementById("modal-activity-form")).open();
    } else if (el.dataset.action === "delete") {
        if (confirm("確定刪除該活動？")) {
            removeActivity(idx);
            renderActivities();
            M.toast({ html: "活動已刪除", classes: "green" });
            // 更新計算區
            document.getElementById('calc-result').style.display = 'none';
            document.getElementById('split-result').style.display = 'none';
        }
    }
});

function clearModalInputs() {
    ["input-C", "input-R", "input-N"].forEach(id => {
        const el = document.getElementById(id);
        el.value = "";
    });
    M.updateTextFields();
}
function fillModalInputs(act) {
    document.getElementById("input-C").value = act.C;
    document.getElementById("input-R").value = act.R;
    document.getElementById("input-N").value = act.N === Infinity ? "" : act.N;
    M.updateTextFields();
}

document.getElementById("modal-save-btn").addEventListener("click", () => {
    const C = Number(document.getElementById("input-C").value);
    const R = Number(document.getElementById("input-R").value);
    let N = document.getElementById("input-N").value;
    N = N === "" || Number(N) <= 0 ? Infinity : Number(N);

    if (isNaN(C) || C <= 0) { M.toast({ html: "C 必須為大於 0 的數值", classes: "red" }); return; }
    if (isNaN(R) || R <= 0) { M.toast({ html: "R 必須為大於 0 的數值", classes: "red" }); return; }

    if (editIndex !== null) updateActivity(editIndex, C, R, N);
    else addActivity(C, R, N);

    renderActivities();
    M.Modal.getInstance(document.getElementById("modal-activity-form")).close();
});

// ---------------------
// 3. 功能二：現抵回饋計算演算法 coreCalculate()
// ---------------------
function coreCalculate(originalAmount, acts) {
    let currentAmount = originalAmount;
    const firstRoundCounts = new Array(acts.length).fill(0);
    const secondRoundCounts = new Array(acts.length).fill(0);

    // 第一輪：先算「滿 (C + R) 才能拿一張券」，並受每日上限 N 限制
    acts.forEach((act, idx) => {
        const { C, R, N } = act;
        const threshold = C + R;
        const maxByAmount = Math.floor(currentAmount / threshold);
        firstRoundCounts[idx] = maxByAmount;
        currentAmount -= maxByAmount * R; // 扣掉已用來換券的金額
    });

    // 第二輪：檢查餘額是否少於第一輪的「應換張數」，若少要補回金額
    acts.forEach((act, idx) => {
        const { C, R } = act;
        const actualCoupons = Math.floor(currentAmount / C);
        const deficit = firstRoundCounts[idx] - actualCoupons; // 少了幾張
        if (deficit > 0) {
            currentAmount += deficit * R; // 補回相應的金額
        }
        secondRoundCounts[idx] = actualCoupons;
    });

    // 計算總回饋金額
    let totalRebate = 0;
    secondRoundCounts.forEach((count, idx) => {
        totalRebate += count * acts[idx].R;
    });

    const finalSpend = currentAmount;
    const discountRate = parseFloat(((finalSpend / originalAmount) * 100).toFixed(5));

    return {
        finalSpend,
        couponsByAct: secondRoundCounts,
        totalRebate,
        discountRate
    };
}

// 核心計算函式改成回傳計算過程文字
function coreCalculateWithSteps(originalAmount, acts) {
    let currentAmount = originalAmount;
    const firstRoundCounts = new Array(acts.length).fill(0);
    const secondRoundCounts = new Array(acts.length).fill(0);
    let stepLog = `原始消費金額：${originalAmount} 元\n\n第一輪計算（依序計算每活動可換券張數）：\n`;

    acts.forEach((act, idx) => {
        const { C, R, N } = act;
        const threshold = C + R;
        const maxByAmount = Math.floor(currentAmount / threshold);
        firstRoundCounts[idx] = maxByAmount;
        currentAmount -= maxByAmount * R; // 扣掉已用來換券的金額

        stepLog += `活動${idx + 1} (滿${C}元回饋${R}元)：\n`;
        stepLog += `  消費金額 / 門檻(含回饋) = ${originalAmount} / ${threshold} = ${maxByAmount} 張 \n`;
        stepLog += `  第一輪換券數: ${firstRoundCounts[idx]} 張\n`;
        stepLog += `  扣除回饋金額: ${firstRoundCounts[idx]} x ${R} = ${firstRoundCounts[idx] * R} 元\n`;
        stepLog += `  餘額更新為: ${currentAmount} 元\n\n`;
    });

    stepLog += "第二輪檢查（餘額能換券張數是否少於第一輪，少的券需補回金額）：\n";
    acts.forEach((act, idx) => {
        const { C, R } = act;
        const actualCoupons = Math.floor(currentAmount / C);
        const deficit = firstRoundCounts[idx] - actualCoupons;
        if (deficit > 0) currentAmount += deficit * R;
        secondRoundCounts[idx] = actualCoupons;
        stepLog += `活動${idx + 1}：餘額 ${currentAmount} 元 / ${C} = ${actualCoupons} 張券\n`;
        if (deficit > 0)
            stepLog += `  有券數不足，補回金額: ${deficit} x ${R} = ${deficit * R} 元\n  更新餘額為 ${currentAmount} 元\n`;
        else
            stepLog += "  無券數不足，餘額不變\n";
    });

    let totalRebate = 0;
    secondRoundCounts.forEach((count, idx) => totalRebate += count * acts[idx].R);
    const finalSpend = currentAmount;
    const discountRate = parseFloat(((finalSpend / originalAmount) * 100).toFixed(5));

    stepLog += `\n計算結果：\n  最終刷卡金額: ${finalSpend} 元\n  總回饋金額: ${totalRebate} 元\n  折數: ${discountRate} %\n`;

    return { finalSpend, couponsByAct: secondRoundCounts, totalRebate, discountRate, stepLog };
}

// 計算並顯示結果，包含印出計算過程
document.getElementById('calc-btn').addEventListener('click', () => {
    const raw = document.getElementById('input-amount').value;
    const originalAmount = Number(raw);
    if (isNaN(originalAmount) || originalAmount <= 0) {
        M.toast({ html: '請輸入大於 0 的整數金額', classes: 'red' });
        return;
    }
    if (activityList.length === 0) {
        M.toast({ html: '請先新增至少一個活動', classes: 'red' });
        return;
    }

    const sortedActs = [...activityList].sort((a, b) => a.C - b.C);
    const { finalSpend, couponsByAct, totalRebate, discountRate, stepLog } = coreCalculateWithSteps(originalAmount, sortedActs);

    document.getElementById('final-spend').innerText = finalSpend;
    document.getElementById('total-rebate').innerText = totalRebate;
    document.getElementById('discount-rate').innerText = discountRate;
    document.getElementById('calc-steps').innerText = stepLog;

    document.getElementById('input-target-spend').value = finalSpend;
    M.updateTextFields();

    const ul = document.getElementById('coupons-list');
    ul.innerHTML = '';
    sortedActs.forEach((act, idx) => {
        const li = document.createElement('li');
        li.className = 'collection-item';
        li.innerText = `滿 ${act.C} 回饋 ${act.R}：${couponsByAct[idx]} 張`;
        ul.appendChild(li);
    });

    document.getElementById('calc-result').style.display = 'block';

    document.getElementById('split-calc-btn').click();
});

// ---------------------
// 4. 功能三：分天刷卡策略 splitDaysCalculate()
// ---------------------

function splitDaysCalculate(finalAmount, acts, targetCoupons) {
    function gcd(a, b) {
        return b === 0 ? a : gcd(b, a % b);
    }
    function lcm(a, b) {
        return (a * b) / gcd(a, b);
    }

    // 先計算所有活動 C 的最小公倍數作為刷卡單位
    let unitC = acts.reduce((acc, act) => lcm(acc, act.C), 1);

    // 準備每日限制 (門檻c, 回饋r, 日上限maxCount)
    const dailyMax = acts.map((act) => ({
        c: act.C,
        r: act.R,
        maxCount: act.N === Infinity ? Infinity : act.N,
    }));

    // 切分每日刷卡金額
    const days = [];
    let remainingAmount = finalAmount;

    while (remainingAmount > 0) {
        const dayAmount = Math.min(remainingAmount, unitC);
        days.push(dayAmount);
        remainingAmount -= dayAmount;
    }

    // 每天計算各活動可換券數(不扣回饋金額)
    const totalVouchers = {};
    const dayResults = days.map((amount) => {
        const dayVouchers = dailyMax.map(({ c, r, maxCount }) => {
            const count = Math.min(Math.floor(amount / c), maxCount);
            totalVouchers[r] = (totalVouchers[r] || 0) + count;
            return { r, count };
        });
        return { amount, dayVouchers };
    });

    // 計算餘券 = 總換券數 - 目標券數
    const excess = {};
    acts.forEach((act, idx) => {
        const requiredCount = targetCoupons[idx] || 0;
        const obtainedCount = totalVouchers[act.R] || 0;
        excess[act.R] = obtainedCount - requiredCount;
    });

    return {
        daysCount: days.length,
        dayResults,
        excess,
    };
}

// 綁定「計算分天」按鈕
document.getElementById('split-calc-btn').addEventListener('click', () => {
    const rawSpend = Number(document.getElementById('input-target-spend').value);
    if (isNaN(rawSpend) || rawSpend <= 0) {
        M.toast({ html: '請輸入大於 0 的整數金額', classes: 'red' });
        return;
    }

    // 檢查是否有現抵計算結果
    const couponItems = document.querySelectorAll('#coupons-list .collection-item');
    if (couponItems.length === 0) {
        M.toast({ html: '請先執行「現抵回饋計算」，才能取得目標券數', classes: 'red' });
        return;
    }

    // 從畫面抓 targetCoupons，結構為陣列，跟 acts 順序一樣
    const targetCoupons = [];
    couponItems.forEach((li) => {
        const text = li.innerText; // 例："滿 3000 回饋 300：17 張"
        const match = text.match(/：(\d+) 張/);
        targetCoupons.push(match ? Number(match[1]) : 0);
    });

    const sortedActs = [...activityList].sort((a, b) => a.C - b.C);

    // 使用新版分天函式
    const { daysCount, dayResults, excess } = splitDaysCalculate(rawSpend, sortedActs, targetCoupons);

    // 顯示天數
    document.getElementById('split-days').innerText = daysCount;

    // 顯示每天刷卡金額與券數明細
    const daysList = document.getElementById('days-amounts-list');
    daysList.innerHTML = '';
    dayResults.forEach((day, idx) => {
        const li = document.createElement('li');
        // 每日券數以「xx 張 r 元」組成字串
        const vouchersDesc = day.dayVouchers
            .map(v => `${v.count} 張 ${v.r} 元`)
            .join(', ');
        li.innerText = `第 ${idx + 1} 天：刷 ${day.amount} 元，回饋：${vouchersDesc}`;
        daysList.appendChild(li);
    });

    // 顯示餘券
    const leftoverUL = document.getElementById('leftover-list');
    leftoverUL.innerHTML = '';
    sortedActs.forEach((act) => {
        const li = document.createElement('li');
        const leftoverCount = excess[act.R] ?? 0;
        li.innerText = `滿 ${act.C} 回饋 ${act.R}：餘 ${leftoverCount} 張`;
        li.className = 'collection-item';
        leftoverUL.appendChild(li);
    });

    // 顯示區塊
    document.getElementById('split-result').style.display = 'block';
});


// ---------------------
// 5. 初始化：載入活動並渲染
// ---------------------
loadActivities();
renderActivities();
