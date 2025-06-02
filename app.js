// app.js
M.AutoInit();
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

// 以 prompt 方式「新增／編輯」活動
function showActivityForm(idx) {
    let C, R, N;
    if (typeof idx === 'number') {
        // 編輯模式：預填原本的值
        const act = activityList[idx];
        C = prompt('請輸入新門檻 C (原 ' + act.C + ')：', act.C);
        if (C === null) return;
        R = prompt('請輸入新回饋 R (原 ' + act.R + ')：', act.R);
        if (R === null) return;
        N = prompt(
            '請輸入新每日上限 N (原 ' + ((act.N === Infinity || act.N === null || act.N === 0) ? 0 : act.N) + ')：',
            (act.N === Infinity || act.N === null || act.N === 0) ? 0 : act.N
        );
        if (N === null) return;
    } else {
        // 新增模式：空白／預設
        C = prompt('請輸入門檻 C：', '3000');
        if (C === null) return;
        R = prompt('請輸入回饋 R：', '300');
        if (R === null) return;
        N = prompt('請輸入每日上限 N (留空或填 0 表示無限)：', '0');
        if (N === null) return;
    }

    C = Number(C);
    R = Number(R);
    N = Number(N);

    // 驗證
    if (isNaN(C) || C <= 0) {
        M.toast({ html: 'C 必須為大於 0 的數值', classes: 'red' });
        return;
    }
    if (isNaN(R) || R <= 0) {
        M.toast({ html: 'R 必須為大於 0 的數值', classes: 'red' });
        return;
    }
    if (isNaN(N) || N <= 0) {
        N = Infinity; // 留空或輸入 <=0，視為無限
    }

    if (typeof idx === 'number') {
        updateActivity(idx, C, R, N);
        M.toast({ html: '活動已更新', classes: 'green' });
    } else {
        addActivity(C, R, N);
        M.toast({ html: '活動已新增', classes: 'green' });
    }
    renderActivities();
}

// 綁定「新增活動」按鈕
document.getElementById('add-activity-btn').addEventListener('click', () => {
    showActivityForm();
});

// 綁定清單中「編輯／刪除」按鈕
activityContainer.addEventListener('click', (e) => {
    const icon = e.target;
    if (!icon.dataset.action) return;
    const idx = Number(icon.dataset.index);
    if (icon.dataset.action === 'delete') {
        removeActivity(idx);
        renderActivities();
        M.toast({ html: '活動已刪除', classes: 'green' });
    } else if (icon.dataset.action === 'edit') {
        showActivityForm(idx);
    }
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

// 綁定「現抵回饋計算」按鈕
document.getElementById('calc-btn').addEventListener('click', () => {
    const raw = document.getElementById('input-amount').value;
    const originalAmount = Number(raw);
    if (isNaN(originalAmount) || originalAmount <= 0) {
        M.toast({ html: '請輸入大於 0 的整數金額', classes: 'red' });
        return;
    }

    // 如果活動清單為空，先提示使用者
    if (activityList.length === 0) {
        M.toast({ html: '請先新增至少一個活動', classes: 'red' });
        return;
    }

    // 先把活動依 C 由小到大排序
    const sortedActs = [...activityList].sort((a, b) => a.C - b.C);
    const { finalSpend, couponsByAct, totalRebate, discountRate } = coreCalculate(originalAmount, sortedActs);

    // 將結果顯示到畫面上
    document.getElementById('final-spend').innerText = finalSpend;
    document.getElementById('total-rebate').innerText = totalRebate;
    document.getElementById('discount-rate').innerText = discountRate;

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
        let tempAmount = amount;
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
