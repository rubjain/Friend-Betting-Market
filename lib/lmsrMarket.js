export const DEFAULT_LMSR_LIQUIDITY = 100;

function toFiniteNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeLiquidity(value) {
  const liquidity = toFiniteNumber(value, DEFAULT_LMSR_LIQUIDITY);
  return liquidity > 0 ? liquidity : DEFAULT_LMSR_LIQUIDITY;
}

function logSumExp(a, b) {
  const max = Math.max(a, b);
  return max + Math.log(Math.exp(a - max) + Math.exp(b - max));
}

function softmaxYes(qYes, qNo, b) {
  const yesScaled = qYes / b;
  const noScaled = qNo / b;
  const max = Math.max(yesScaled, noScaled);
  const yesExp = Math.exp(yesScaled - max);
  const noExp = Math.exp(noScaled - max);
  return yesExp / (yesExp + noExp);
}

export class LMSRMarket {
  constructor({ qYes = 0, qNo = 0, b = DEFAULT_LMSR_LIQUIDITY } = {}) {
    this.qYes = toFiniteNumber(qYes, 0);
    this.qNo = toFiniteNumber(qNo, 0);
    this.b = normalizeLiquidity(b);
  }

  getProbability() {
    const probabilityYes = softmaxYes(this.qYes, this.qNo, this.b);
    const probabilityNo = 1 - probabilityYes;
    return {
      yes: probabilityYes,
      no: probabilityNo,
      probabilityYes,
      probabilityNo,
      priceYes: probabilityYes,
      priceNo: probabilityNo,
    };
  }

  getCost(qYes = this.qYes, qNo = this.qNo) {
    return this.b * logSumExp(qYes / this.b, qNo / this.b);
  }

  previewBuy(side, shares) {
    const quantity = Math.max(0, toFiniteNumber(shares, 0));
    const beforeCost = this.getCost();
    const afterQYes = this.qYes + (side === "YES" ? quantity : 0);
    const afterQNo = this.qNo + (side === "NO" ? quantity : 0);
    const afterCost = this.getCost(afterQYes, afterQNo);
    const cost = afterCost - beforeCost;
    const afterMarket = new LMSRMarket({ qYes: afterQYes, qNo: afterQNo, b: this.b });
    return {
      side,
      shares: quantity,
      cost,
      averagePrice: quantity > 0 ? cost / quantity : this.getProbability()[side === "YES" ? "yes" : "no"],
      qYes: afterQYes,
      qNo: afterQNo,
      beforeProbability: this.getProbability(),
      afterProbability: afterMarket.getProbability(),
    };
  }

  getSharesForCost(side, budget) {
    const targetCost = Math.max(0, toFiniteNumber(budget, 0));
    if (targetCost <= 0) return 0;

    let low = 0;
    let high = Math.max(1, targetCost / 0.001);
    while (this.previewBuy(side, high).cost < targetCost) {
      high *= 2;
    }

    for (let i = 0; i < 80; i += 1) {
      const mid = (low + high) / 2;
      if (this.previewBuy(side, mid).cost > targetCost) {
        high = mid;
      } else {
        low = mid;
      }
    }

    return low;
  }

  previewSell(side, shares) {
    const quantity = Math.max(0, toFiniteNumber(shares, 0));
    const beforeCost = this.getCost();
    const afterQYes = this.qYes - (side === "YES" ? quantity : 0);
    const afterQNo = this.qNo - (side === "NO" ? quantity : 0);
    const afterCost = this.getCost(afterQYes, afterQNo);
    const proceeds = beforeCost - afterCost;
    const afterMarket = new LMSRMarket({ qYes: afterQYes, qNo: afterQNo, b: this.b });
    return {
      side,
      shares: quantity,
      proceeds,
      averagePrice: quantity > 0 ? proceeds / quantity : this.getProbability()[side === "YES" ? "yes" : "no"],
      qYes: afterQYes,
      qNo: afterQNo,
      beforeProbability: this.getProbability(),
      afterProbability: afterMarket.getProbability(),
    };
  }

  buyYes(shares) {
    const preview = this.previewBuy("YES", shares);
    this.qYes = preview.qYes;
    return preview;
  }

  buyNo(shares) {
    const preview = this.previewBuy("NO", shares);
    this.qNo = preview.qNo;
    return preview;
  }

  sellYes(shares) {
    const preview = this.previewSell("YES", shares);
    this.qYes = preview.qYes;
    return preview;
  }

  sellNo(shares) {
    const preview = this.previewSell("NO", shares);
    this.qNo = preview.qNo;
    return preview;
  }
}

export function createLmsrMarketFromMarket(market = {}) {
  const pool = market.liquidityPool ?? {};
  return new LMSRMarket({
    qYes: pool.qYes ?? pool.yesReserve ?? 0,
    qNo: pool.qNo ?? pool.noReserve ?? 0,
    b: pool.liquidityParameter ?? pool.b ?? market.liquidityParameter ?? DEFAULT_LMSR_LIQUIDITY,
  });
}
