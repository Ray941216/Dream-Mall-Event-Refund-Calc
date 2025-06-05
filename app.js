// app.js
// 2025-06-05 11:00

// ---------------------
// 1. 活動設定管理：使用 localStorage 存／取
// ---------------------
const STORAGE_KEY = 'activity_list';
let activityList = [];

function loadActivities() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
        try {
            activityList = JSON.parse(raw);
        } catch {
            activityList = [];
        }
    }
    // 把 0 或 null 當成 Infinity 處理
    for (let i = 0; i < activityList.length; i++) {
        if (activityList[i].N === 0 || activityList[i].N === null) {
            activityList[i].N = Infinity;
        }
    }
}

function saveActivities() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activityList));
}

function addActivity(C, R, N) {
    activityList.push({ C, R, N });
    saveActivities();
}

function updateActivity(index, C, R, N) {
    activityList[index] = { C, R, N };
    saveActivities();
}

function removeActivity(index) {
    activityList.splice(index, 1);
    saveActivities();
}

// ---------------------
// 2. 活動設定 UI：渲染／Modal 管理
// ---------------------
document.addEventListener('DOMContentLoaded', () => {
    M.AutoInit();
    const modalElems = document.querySelectorAll('.modal');
    M.Modal.init(modalElems);
    const collElems = document.querySelectorAll('.collapsible');
    M.Collapsible.init(collElems);

    loadActivities();
    renderActivities();
});

const activityContainer = document.getElementById('activity-container');
let editIndex = null;

function renderActivities() {
    activityContainer.innerHTML = '';
    activityList.forEach((act, idx) => {
        const li = document.createElement('li');
        li.className = 'collection-item';
        li.innerHTML = `
      <div>
        滿 <strong>${act.C}</strong> 元 回饋 <strong>${act.R}</strong> 元，
        日限 ${act.N === Infinity ? '無限' : act.N} 份
        <a href="#!" class="secondary-content">
          <i class="material-icons pointer" data-action="edit" data-index="${idx}">edit</i>
          <i class="material-icons pointer" data-action="delete" data-index="${idx}">delete</i>
        </a>
      </div>
    `;
        activityContainer.appendChild(li);
    });
}

function clearModalInputs() {
    ['input-C', 'input-R', 'input-N'].forEach(id => {
        document.getElementById(id).value = '';
    });
    M.updateTextFields();
}

function fillModalInputs(act) {
    document.getElementById('input-C').value = act.C;
    document.getElementById('input-R').value = act.R;
    document.getElementById('input-N').value = act.N === Infinity ? '' : act.N;
    M.updateTextFields();
}

document.getElementById('add-activity-btn').addEventListener('click', () => {
    editIndex = null;
    document.getElementById('modal-title').innerText = '新增活動';
    clearModalInputs();
    M.Modal.getInstance(document.getElementById('modal-activity-form')).open();
});

activityContainer.addEventListener('click', (e) => {
    const el = e.target;
    if (!el.dataset.action) return;
    const idx = Number(el.dataset.index);
    if (el.dataset.action === 'edit') {
        editIndex = idx;
        document.getElementById('modal-title').innerText = '編輯活動';
        fillModalInputs(activityList[idx]);
        M.Modal.getInstance(document.getElementById('modal-activity-form')).open();
    } else if (el.dataset.action === 'delete') {
        if (confirm('確定刪除該活動？')) {
            removeActivity(idx);
            renderActivities();
            M.toast({ html: '活動已刪除', classes: 'green' });
            // 刪除活動後，要讓前端的計算結果隱藏
            document.getElementById('calc-result').style.display = 'none';
            document.getElementById('split-result').style.display = 'none';
        }
    }
});

document.getElementById('modal-save-btn').addEventListener('click', () => {
    const C = Number(document.getElementById('input-C').value);
    const R = Number(document.getElementById('input-R').value);
    let N = document.getElementById('input-N').value;
    N = N === '' || Number(N) <= 0 ? Infinity : Number(N);

    if (isNaN(C) || C <= 0) {
        M.toast({ html: 'C 必須為大於 0 的數值', classes: 'red' });
        return;
    }
    if (isNaN(R) || R <= 0) {
        M.toast({ html: 'R 必須為大於 0 的數值', classes: 'red' });
        return;
    }

    if (editIndex !== null) {
        updateActivity(editIndex, C, R, N);
        M.toast({ html: '活動已更新', classes: 'green' });
    } else {
        addActivity(C, R, N);
        M.toast({ html: '活動已新增', classes: 'green' });
    }

    renderActivities();
    M.Modal.getInstance(document.getElementById('modal-activity-form')).close();
});

// ---------------------
// 3. 功能二：現抵回饋計算 (含詳細計算過程)
// ---------------------

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

        stepLog += `活動${idx + 1} (滿${C}元回饋${R}元)：\n`;
        stepLog += `  消費金額 / 門檻(含回饋) = ${currentAmount} / ${threshold} = ${maxByAmount} 張 \n`;
        stepLog += `  第一輪換券數: ${firstRoundCounts[idx]} 張\n`;
        stepLog += `  扣除回饋金額: ${firstRoundCounts[idx]} x ${R} = ${firstRoundCounts[idx] * R} 元\n`;
        currentAmount -= maxByAmount * R; // 扣掉已用來換券的金額
        stepLog += `  餘額更新為: ${currentAmount} 元\n\n`;
    });

    stepLog += "第二輪檢查（餘額能換券張數是否少於第一輪，少的券需補回金額）：\n";
    acts.forEach((act, idx) => {
        const { C, R } = act;
        const actualCoupons = Math.floor(currentAmount / C);
        const deficit = firstRoundCounts[idx] - actualCoupons;
        secondRoundCounts[idx] = actualCoupons;
        stepLog += `活動${idx + 1}：餘額 ${currentAmount} 元 / ${C} = ${actualCoupons} 張券\n`;
        if (deficit > 0) currentAmount += deficit * R;
        if (deficit > 0) {
            stepLog += `  有券數不足，補回金額: ${deficit} x ${R} = ${deficit * R} 元\n`;
            stepLog += `  更新餘額為 ${currentAmount} 元\n`;
        } else {
            stepLog += "  無券數不足，餘額不變\n";
        }
    });

    let totalRebate = 0;
    secondRoundCounts.forEach((count, idx) => totalRebate += count * acts[idx].R);
    const finalSpend = currentAmount;
    const discountRate = parseFloat(((finalSpend / originalAmount) * 100).toFixed(5));

    stepLog += `\n計算結果：\n  最終刷卡金額: ${finalSpend} 元\n  總回饋金額: ${totalRebate} 元\n  折數: ${discountRate} %\n`;

    return { finalSpend, couponsByAct: secondRoundCounts, totalRebate, discountRate, stepLog };
}

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

    // 自動觸發分天計算
    // document.getElementById('split-card').style.display = 'block';
    $('#split-card').fadeIn();
    document.getElementById('split-calc-btn').click();
});

// 監聽 #input-amount 按下 Enter 鍵時，自動觸發計算按鈕
const inputAmountEl = document.getElementById('input-amount');
inputAmountEl.addEventListener('keydown', (e) => {
    // 如果按下的按鍵是 Enter (keyCode 13 或 e.key === 'Enter')
    if (e.key === 'Enter' || e.keyCode === 13) {
        e.preventDefault(); // 防止表單自動提交或換行
        document.getElementById('calc-btn').click();
    }
});


// ---------------------
// 4. 功能三：動態分天刷卡策略
// ---------------------

// 計算「每日最大刷卡額」：取有限日限活動 C×N 的最大；若全部日限無限，用剩餘金額
function calculateMaxDailySpend(dailyMax, remainAmount) {
    const finiteCaps = dailyMax
        .filter(act => act.n < 1e9)
        .map(act => act.n * act.c);
    if (finiteCaps.length === 0) {
        return remainAmount;
    }
    return Math.max(...finiteCaps);
}

/**
 * 計算兩數的最大公因數 (GCD)
 */
function gcd(x, y) {
    return y === 0 ? x : gcd(y, x % y);
}

// gcd(array)
function gcdArray(array) {
    return array.reduce((acc, val) => gcd(acc, val), array[0]);
}

// 計算 C 的最小公倍數
function lcm(a, b) {
    return (a * b) / gcd(a, b);
}

function computeLCMForCs(acts) {
    return acts.reduce((acc, act) => lcm(acc, act.C), 1);
}

/**
 * dynamicSplitRemaining(remainAmount, acts, remainCoupons)
 *    - remainAmount：尚未刷的金額
 *    - acts：依 C 由小到大排序的活動陣列
 *    - remainCoupons：各活動「還沒折抵到」的券數需求（此處僅用作最後計算餘券）
 *
 *  返回：
 *    { futureResults, futureGot }
 *      - futureResults：每一天分天計算的結果
 *          [
 *            {
 *              amount: 該天刷卡金額,
 *              actualSpend: 實際刷卡金額,
 *              dayVouchers: [ { r, count }, … ],
 *              totalDayRebate: 當天回饋總金額
 *            },
 *            …
 *          ]
 *      - futureGot：一個 object，key=R、value=該 R 面額券分天累計換到的張數
 */
function dynamicSplitRemaining(remainAmount, acts, remainCoupons) {
    console.log('\n===== 處理剩餘金額與券數 =====');
    console.log('剩餘金額:', remainAmount);
    console.log('原始剩餘券數需求 (僅供最後扣差用):', remainCoupons);

    // dailyMax: 將原本的 acts 轉成方便使用的 { c, r, n }
    const dailyMax = acts.map(act => ({
        c: act.C,
        r: act.R,
        n: act.N === Infinity ? 1e9 : act.N
    }));


    // 算出各個有限制數量的活動滿額彼此的 lcms, [lcm(act0, act1), lcm(act0, act2), ..., lcm(act1, act2), ..., lcm(act2, act3), ..., lcm(act0, act1, act2, ..., act3)])]
    const limitedActs = acts.filter(act => act.N < 1e9)
    const lcms = limitedActs.filter(act => act.N < 1e9).reduce((acc, act, i) => {
        return acc.concat(limitedActs.slice(i + 1).map(otherAct => lcm(act.C, otherAct.C)));
    }, []);
    console.log('各活動滿額彼此的 lcms:', lcms);

    // 算出有限制數量的最大金額 max_caps = [act0.C * act0.N, act1.C * act1.N, ..., act2.C * act2.N, ..., act3.C * act3.N]
    const maxCaps = limitedActs.map(act => act.C * act.N);
    console.log('有限制數量的最大金額:', maxCaps);


    const futureResults = [];
    const futureGot = {}; // 用來累計「分天換到的券數」

    let dayIndex = 0;
    // 當剩餘金額 > 0 且 有需求券 (remainCoupons) > 0 才要繼續
    while (remainAmount > 0 && remainCoupons.some(c => c > 0)) {
        console.log(`-- 剩餘第 ${dayIndex + 1} 天計算 --`);
        console.log('  剩餘金額:', remainAmount);
        console.log('  剩餘券數需求:', remainCoupons);

        // 去除重複(lcms+maxCaps)並排序，由小而大，並且移除大於 remainAmount 的值，並加入 remainAmount
        let uniqueCaps = [...new Set(lcms.concat(maxCaps))].sort((a, b) => a - b).filter(cap => cap <= remainAmount).concat(remainAmount);
        console.log('去除重複(lcms+maxCaps)並排序，由小而大:', uniqueCaps);
        // 在 uniqueCaps 中補入從min(uniqueCaps)到max(uniqueCaps) 以 act.C 的倍數填充為 step 的數值
        for (let i_act = 0; i_act < acts.length; i_act++) {
            const a = acts[i_act];
            for (let val = Math.ceil(Math.min(...uniqueCaps) / a.C) * a.C; val <= Math.max(...uniqueCaps); val += a.C) {
                if (!uniqueCaps.includes(val)) uniqueCaps.push(val);
            }
        }
        uniqueCaps.sort((a, b) => a - b);
        console.log('在 uniqueCaps 中從uniqueCaps[0]到uniqueCaps[-1]補入 以 act.C 的倍數填充 為 step 的數值:', uniqueCaps);


        // 計算每個 uniqueCaps 中每個金額的回饋數量(gotCoupons)和損失數量(lossCouopns) ， expected={cap: {got:x, loss:y, total: x-y}}
        let expectedCoupons = {};
        console.log(acts);

        const Cgcd = gcdArray(acts.map(act => act.C));
        console.log('最大公因數:', Cgcd);


        for (let i_uc = 0; i_uc < uniqueCaps.length; i_uc++) {
            gotRefund = 0;
            lossRefund = 0;
            for (let i_act = 0; i_act < acts.length; i_act++) {
                if (uniqueCaps[i_uc] < acts[i_act].C || remainCoupons[i_act] <= 0) {
                    continue;
                }



                expGot = Math.floor(uniqueCaps[i_uc] / acts[i_act].C)
                expLoss = (uniqueCaps[i_uc] % acts[i_act].C) / acts[i_act].C
                if (expGot > acts[i_act].N) {
                    expLoss += expGot - acts[i_act].N
                    expGot = acts[i_act].N
                }

                expLoss *= Math.sqrt(Math.max(remainCoupons[i_act] - expGot, 0) * acts[i_act].C / Cgcd)
                // expGot *= acts[i_act].C / Cgcd

                // expGot += Math.floor((remainAmount - uniqueCaps[i_uc]) / acts[i_act].C) * (remainCoupons[i_act] - expGot)



                gotRefund += expGot
                lossRefund += expLoss
            }

            expectedCoupons[uniqueCaps[i_uc]] = {
                got: gotRefund, loss: lossRefund, lossRate: lossRefund / gotRefund
            }
        }
        console.log('每個 uniqueCaps 中每個金額的回饋數量(gotCoupons)和損失數量(lossCouopns) ', expectedCoupons);

        // 以 lossRate 由小到大排序， 如果 lossRate 相同 expectedCoupons.keys() 由大至小
        const sortedExpectedCoupons = Object.keys(expectedCoupons).sort((a, b) => {
            if (expectedCoupons[a].lossRate === expectedCoupons[b].lossRate) {
                return b - a;
            }
            return expectedCoupons[a].lossRate - expectedCoupons[b].lossRate
        })
        console.log('以 lossRate 由小到大排序:', sortedExpectedCoupons);

        // 選用 lossRate 最小的金額來刷
        let dayAmount = sortedExpectedCoupons[0];
        console.log('  選用 lossRate 最小的金額來刷:', dayAmount);
        // 計算當天能換到的券數：只以「金額／門檻」與「日限 N」做上限
        const dayVouchers = dailyMax.map((act, idx) => {
            const maxCountByAmt = Math.floor(dayAmount / act.c);
            const count = Math.min(maxCountByAmt, act.n);
            return { r: act.r, count };
        });
        console.log('  換券數:', dayVouchers.map(v => v.count));

        // 當天拿到的回饋總金額 = ∑(count * r)
        const totalDayRebate = dayVouchers.reduce((acc, v) => acc + v.count * v.r, 0);
        console.log('  當天回饋總金額:', totalDayRebate);

        // 實際刷卡金額 = dayAmount - totalDayRebate
        const actualSpend = dayAmount - totalDayRebate;
        console.log('  實際刷卡:', actualSpend);

        futureResults.push({
            amount: dayAmount,
            actualSpend,
            dayVouchers,
            totalDayRebate
        });

        // 更新 remainCoupons & futureGot
        dayVouchers.forEach(({ r, count }, idx) => {
            // 這裡允許 remainCoupons[idx] 變負數，代表「超額換到」
            remainCoupons[idx] -= count;
            futureGot[r] = (futureGot[r] || 0) + count;
        });

        // 更新 remainAmount
        remainAmount -= dayAmount;
        console.log('  更新後剩餘券數需求:', remainCoupons);
        console.log('  更新後剩餘金額:', remainAmount);

        dayIndex++;
    }

    console.log('  未來取得券數:', futureGot);
    console.log('===== 完成剩餘計算 =====\n');
    return { futureResults, futureGot };
}

// 產生可編輯日刷金額的輸入框
function renderDailyAmountInputs(dailyResults, preserveInputs = null, startUpdateIndex = 0) {
    const container = document.getElementById('days-amounts-list');
    container.innerHTML = ''; // 清空

    dailyResults.forEach((day, idx) => {
        const li = document.createElement('li');
        li.style.marginBottom = '8px';

        const label = document.createElement('label');
        label.innerText = `第 ${idx + 1} 天刷卡金額: `;
        label.style.marginRight = '12px';

        const input = document.createElement('input');
        input.type = 'number';
        input.min = 0;
        input.value = day.amount;
        input.dataset.dayIndex = idx;
        input.style.width = '150px';
        input.className = 'validate';

        // 回饋券文字：顯示「張數 + 面額」以及「當天總回饋金額」
        const voucherDesc = day.dayVouchers
            .map(v => `${v.count} 張 ${v.r} 元`)
            .join(', ');
        const voucherSpan = document.createElement('span');
        voucherSpan.style.marginLeft = '20px';
        voucherSpan.innerText = `回饋：${voucherDesc}（總 ${day.totalDayRebate} 元）`;

        li.appendChild(label);
        li.appendChild(input);
        li.appendChild(voucherSpan);
        container.appendChild(li);

        bindInputDebounce(input);
    });

    M.updateTextFields();
}

function bindInputDebounce(input) {
    let debounceTimer;
    input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const dayIndex = Number(input.dataset.dayIndex);
            onDailyAmountChange(dayIndex);
        }, 300);
    });
}

// 使用者修改某天金額後，從該天開始重新計算後續
function onDailyAmountChange(changedDayIndex) {
    const sortedActs = [...activityList].sort((a, b) => a.C - b.C);
    const couponItems = document.querySelectorAll('#coupons-list .collection-item');
    if (couponItems.length === 0) {
        M.toast({ html: '請先執行現抵回饋計算', classes: 'red' });
        return;
    }

    // 讀取「現抵回饋計算」階段的目標券數（也就是 couponsByAct）
    let targetCoupons = [];
    couponItems.forEach(li => {
        const match = li.innerText.match(/：(\d+) 張/);
        targetCoupons.push(match ? Number(match[1]) : 0);
    });

    const originalFinal = Number(document.getElementById('input-target-spend').value);
    const inputs = document.querySelectorAll('#days-amounts-list input');
    const userInputs = Array.from(inputs).map(input => {
        const val = Number(input.value);
        return isNaN(val) || val < 0 ? 0 : val;
    });

    console.log(`>>> 使用者修改第 ${changedDayIndex + 1} 天刷卡金額，觸發重新計算 <<<`);
    console.log('用戶目前輸入金額陣列：', userInputs);

    // 1. 計算「保留天數」之前（含第 changedDayIndex 天）已刷的金額與換到的券
    let remainAmount = originalFinal;
    let remainCoupons = [...targetCoupons];
    const preservedResults = [];

    for (let i = 0; i <= changedDayIndex; i++) {
        const dayAmount = userInputs[i];
        // 當天換券：只以「金額／門檻」與「日限 N」作為上限
        const dayVouchers = sortedActs.map((act, idx) => {
            const maxCountByAmt = Math.floor(dayAmount / act.C);
            const count = Math.min(maxCountByAmt, act.N === Infinity ? 1e9 : act.N);
            return { r: act.R, count };
        });
        const totalRebate = dayVouchers.reduce((acc, v) => acc + v.count * v.r, 0);
        const actualSpend = dayAmount - totalRebate;

        remainAmount -= dayAmount;
        dayVouchers.forEach(({ count }, idx) => {
            remainCoupons[idx] -= count;
        });

        preservedResults.push({
            amount: dayAmount,
            actualSpend,
            dayVouchers,
            totalDayRebate: totalRebate
        });
        console.log(`保留第 ${i + 1} 天: 刷 ${dayAmount}，拿券 ${dayVouchers.map(v => v.count)}，剩金 ${remainAmount}，剩券 ${remainCoupons}`);
    }

    // 2. 用剩餘的 remainAmount 和 remainCoupons 做動態分天
    const { futureResults, futureGot } = dynamicSplitRemaining(remainAmount, sortedActs, remainCoupons);

    // 3. 合併保留結果 & 未來結果
    const allResults = preservedResults.concat(futureResults);
    const daysCount = allResults.length;

    console.log('重新計算結果：需要天數', daysCount);
    console.log('每日完整結果：', allResults);

    // 4. 計算「分天後實際換到的總券數」
    const totalVouchersObtained = {};
    allResults.forEach(day => {
        day.dayVouchers.forEach(v => {
            totalVouchersObtained[v.r] = (totalVouchersObtained[v.r] || 0) + v.count;
        });
    });

    // 5. 計算【餘券】= (分天後實際換到的總券數) – (現抵計算使用掉的目標券數)
    const remainingVouchers = {};

    // 讀取現抵計算使用掉的目標券數
    targetCoupons = [];
    couponItems.forEach(li => {
        const match = li.innerText.match(/：(\d+) 張/);
        targetCoupons.push(match ? Number(match[1]) : 0);
    });

    console.log('目標券數:', targetCoupons);

    sortedActs.forEach((act, idx) => {
        const obtained = totalVouchersObtained[act.R] || 0;
        const required = targetCoupons[idx] || 0;
        remainingVouchers[act.R] = obtained - required;
    });

    console.log('實際取得的各回饋券總張數:', totalVouchersObtained);
    console.log('各券餘數 (還給店家後):', remainingVouchers);

    // 6. 更新畫面
    document.getElementById('split-days').innerText = daysCount;
    renderDailyAmountInputs(allResults, userInputs, changedDayIndex + 1);

    const leftoverUL = document.getElementById('leftover-list');
    leftoverUL.innerHTML = '';
    sortedActs.forEach(act => {
        const leftoverCount = remainingVouchers[act.R] ?? 0;
        const li = document.createElement('li');
        li.className = 'collection-item';
        li.innerText = `滿 ${act.C} 回饋 ${act.R}：餘 ${leftoverCount} 張`;
        leftoverUL.appendChild(li);
    });
    document.getElementById('split-result').style.display = 'block';
}

document.getElementById('split-calc-btn').addEventListener('click', () => {
    const rawSpend = Number(document.getElementById('input-target-spend').value);
    if (isNaN(rawSpend) || rawSpend <= 0) {
        M.toast({ html: '請輸入大於 0 的整數金額', classes: 'red' });
        return;
    }

    const couponItems = document.querySelectorAll('#coupons-list .collection-item');
    if (couponItems.length === 0) {
        M.toast({ html: '請先執行「現抵回饋計算」，才能取得目標券數', classes: 'red' });
        return;
    }

    // 讀取「現抵」階段的目標券數
    let targetCoupons = [];
    couponItems.forEach(li => {
        const match = li.innerText.match(/：(\d+) 張/);
        targetCoupons.push(match ? Number(match[1]) : 0);
    });

    const sortedActs = [...activityList].sort((a, b) => a.C - b.C);

    console.log('\n>>> 使用「計算分天」按鈕，開始分天計算 <<<');
    console.log('最終刷卡金額 (totalAmount):', rawSpend);
    console.log('目標券數:', targetCoupons);

    // 1. 執行分天計算
    const { futureResults, futureGot } = dynamicSplitRemaining(rawSpend, sortedActs, targetCoupons);

    console.log('分天計算結果：需要天數', futureResults.length);
    console.log('每日建議結果：', futureResults);
    console.log('未來取得券數:', futureGot);

    // 2. 計算「分天後實際換到的總券數」
    const totalVouchersObtained = {};
    futureResults.forEach(day => {
        day.dayVouchers.forEach(v => {
            totalVouchersObtained[v.r] = (totalVouchersObtained[v.r] || 0) + v.count;
        });
    });

    // 3. 計算【餘券】= (分天後實際換到的總券數) – (現抵計算使用掉的目標券數)
    const remainingVouchers = {};

    // 讀取現抵計算使用掉的目標券數
    targetCoupons = [];
    couponItems.forEach(li => {
        const match = li.innerText.match(/：(\d+) 張/);
        targetCoupons.push(match ? Number(match[1]) : 0);
    });

    console.log('目標券數:', targetCoupons);

    sortedActs.forEach((act, idx) => {
        const obtained = totalVouchersObtained[act.R] || 0;
        const required = targetCoupons[idx] || 0;
        remainingVouchers[act.R] = obtained - required;
    });

    console.log('分天總計換到券數:', totalVouchersObtained);
    console.log('分天後餘券狀況:', remainingVouchers);

    // 4. 更新畫面
    document.getElementById('split-days').innerText = futureResults.length;
    renderDailyAmountInputs(futureResults);

    const leftoverUL = document.getElementById('leftover-list');
    leftoverUL.innerHTML = '';
    sortedActs.forEach(act => {
        const leftoverCount = remainingVouchers[act.R] ?? 0;
        const li = document.createElement('li');
        li.className = 'collection-item';
        li.innerText = `滿 ${act.C} 回饋 ${act.R}：餘 ${leftoverCount} 張`;
        leftoverUL.appendChild(li);
    });
    document.getElementById('split-result').style.display = 'block';
});

// 初始化：載入並渲染活動
loadActivities();
renderActivities();
