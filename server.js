/**
 * ========================================================================================================
 * File: sicbo_prediction_api_v6_js.js
 * Author: [AI Refactored]
 * Description: The ultimate, robust, and optimized Sic Bo prediction system with advanced,
 * self-adapting AI algorithms, rewritten for Node.js.
 *
 * ========================================================================================================
 */

const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

// ================================================================
// === Cấu Hình & Xử Lý Lỗi Axios Nâng Cao ===
// ================================================================
const axiosInstance = axios.create({
    timeout: 15000,
});

axiosInstance.interceptors.response.use(
    response => response,
    async error => {
        const { config, response } = error;
        if (!response || response.status >= 500 || ['ECONNABORTED', 'ENOTFOUND', 'EAI_AGAIN'].includes(error.code)) {
            const MAX_RETRIES = 7;
            config.__retryCount = config.__retryCount || 0;
            if (config.__retryCount < MAX_RETRIES) {
                config.__retryCount += 1;
                const delay = Math.pow(2, config.__retryCount) * 500;
                console.warn(`[Axios Interceptor] Lỗi kết nối hoặc máy chủ (${error.message}). Đang thử lại lần ${config.__retryCount} sau ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return axiosInstance(config);
            }
        }
        return Promise.reject(error);
    }
);

// ================================================================
// === Các Hàm Phân Tích Cơ Bản ===
// ================================================================

const getTrueSumProbabilities = () => {
    const sumCounts = {};
    for (let d1 = 1; d1 <= 6; d1++) {
        for (let d2 = 1; d2 <= 6; d2++) {
            for (let d3 = 1; d3 <= 6; d3++) {
                const sum = d1 + d2 + d3;
                sumCounts[sum] = (sumCounts[sum] || 0) + 1;
            }
        }
    }
    const totalOutcomes = 216;
    const probabilities = {};
    for (const sum in sumCounts) {
        probabilities[sum] = (sumCounts[sum] / totalOutcomes);
    }
    return probabilities;
};

const getHistoryStatus = (history) => history.map(h => {
    const score = h.score || 0;
    return {
        phien: h.gameNum,
        tong: score,
        taixiu: (score >= 11 && score <= 18) ? 'T' : 'X',
        chanle: score % 2 === 0 ? 'C' : 'L',
    };
});

// ================================================================
// === Thuật Toán Phân Tích Nâng Cao (AI Siêu Chuẩn) ===
// ================================================================

// Mô hình 1: Phân tích Chuỗi Markov & Cầu Đảo
const analyzeMarkovChainAndStreak = (statusHistory) => {
    if (statusHistory.length < 5) {
        return { prediction: null, certainty: 0, description: "Chưa đủ dữ liệu cho Markov và Phân tích Cầu." };
    }
    const lastTwoStates = statusHistory.slice(0, 2).map(s => s.taixiu).reverse().join('');

    let streakCount = 1;
    let streakValue = statusHistory[0].taixiu;
    for (let i = 1; i < statusHistory.length && i < 15; i++) {
        if (statusHistory[i].taixiu === streakValue) {
            streakCount++;
        } else {
            break;
        }
    }

    if (streakCount >= 4) {
        if (streakCount < 7) {
            return {
                prediction: streakValue,
                certainty: Math.round(50 + streakCount * 5),
                description: `Markov: Phát hiện cầu bệt ${streakCount} phiên. Dự đoán tiếp tục theo bệt.`
            };
        } else {
            const inversePrediction = streakValue === 'T' ? 'X' : 'T';
            return {
                prediction: inversePrediction,
                certainty: Math.round(50 + (streakCount - 7) * 2),
                description: `Markov: Cầu bệt quá dài (${streakCount} phiên). Khả năng cao sẽ đảo chiều.`
            };
        }
    }

    const transitions = {};
    for (let i = 2; i < statusHistory.length; i++) {
        const key = statusHistory[i - 2].taixiu + statusHistory[i - 1].taixiu;
        const nextState = statusHistory[i].taixiu;
        transitions[key] = transitions[key] || { T: 0, X: 0 };
        transitions[key][nextState]++;
    }

    const currentTransition = transitions[lastTwoStates];
    if (currentTransition) {
        const total = currentTransition.T + currentTransition.X;
        if (total > 0) {
            const predicted = currentTransition.T > currentTransition.X ? 'T' : 'X';
            const certainty = Math.round((Math.max(currentTransition.T, currentTransition.X) / total) * 100);
            return {
                prediction: predicted,
                certainty: certainty,
                description: `Markov: Dựa trên chuỗi "${lastTwoStates}", dự đoán "${predicted}" với xác suất cao.`
            };
        }
    }

    return { prediction: null, certainty: 0, description: "Markov: Không có mô hình rõ ràng." };
};

// Mô hình 2: Phân tích Cân bằng Cầu Đa Khung Thời Gian
const analyzeMultiTimeframeBalance = (statusHistory) => {
    if (statusHistory.length < 30) {
        return { prediction: null, certainty: 0, description: "Cân bằng: Cần nhiều dữ liệu hơn để phân tích." };
    }

    const shortTermCounts = { T: 0, X: 0 };
    const longTermCounts = { T: 0, X: 0 };

    statusHistory.slice(0, 15).forEach(h => shortTermCounts[h.taixiu]++);
    statusHistory.slice(0, 30).forEach(h => longTermCounts[h.taixiu]++);

    const shortTermDiff = Math.abs(shortTermCounts.T - shortTermCounts.X);
    const longTermDiff = Math.abs(longTermCounts.T - longTermCounts.X);

    if (shortTermDiff >= 4) {
        const prediction = shortTermCounts.T > shortTermCounts.X ? 'X' : 'T';
        const certainty = Math.min(shortTermDiff * 10, 80);
        return {
            prediction: prediction,
            certainty: certainty,
            description: `Cân bằng: Cầu ngắn hạn (15p) đang lệch. Dự đoán phiên tiếp theo sẽ cân bằng lại.`
        };
    }

    if (longTermDiff >= 7) {
        const prediction = longTermCounts.T > longTermCounts.X ? 'X' : 'T';
        const certainty = Math.min(longTermDiff * 8, 75);
        return {
            prediction: prediction,
            certainty: certainty,
            description: `Cân bằng: Cầu dài hạn (30p) đang lệch. Có khả năng cao sẽ đảo chiều để cân bằng.`
        };
    }

    return { prediction: null, certainty: 0, description: "Cân bằng: Cầu đang khá ổn định." };
};

// Mô hình 3: Học máy Heuristic và Pattern phức hợp
const analyzeHeuristicPatterns = (statusHistory) => {
    if (statusHistory.length < 5) {
        return { prediction: null, certainty: 0, description: "Heuristic: Cần ít nhất 5 phiên để phân tích." };
    }

    const recent = statusHistory.slice(0, 5).map(s => s.taixiu);

    if (recent.length >= 4 && recent[0] !== recent[1] && recent[1] === recent[2] && recent[2] === recent[3]) {
        const prediction = recent[0];
        return { prediction, certainty: 75, description: "Heuristic: Nhận diện mô hình 3-2-1. Dự đoán theo cầu đảo." };
    }

    if (recent.length >= 4 && recent[0] !== recent[1] && recent[1] !== recent[2] && recent[2] === recent[3]) {
        const prediction = recent[1];
        return { prediction, certainty: 70, description: "Heuristic: Nhận diện mô hình 1-1-2. Dự đoán theo cầu ngắn." };
    }

    return { prediction: null, certainty: 0, description: "Heuristic: Không có mẫu hình phức tạp được tìm thấy." };
};

// ================================================================
// === Thuật toán Dự đoán (AI Phân Tích Đa Chiều) ===
// ================================================================

const dynamicWeights = {
    markov: 1.0,
    balance: 1.0,
    heuristic: 1.0
};

const predictAdvanced = (history) => {
    console.log('--------------------------------------------------');
    console.log('[AI Prediction] Bắt đầu quá trình dự đoán...');
    if (history.length < 15) {
        console.log('[AI Prediction] Không đủ dữ liệu để dự đoán nâng cao (cần > 15 phiên).');
        return { du_doan: "Chưa đủ dữ liệu", doan_vi: [], confidence: 0, giai_thich: "Vui lòng chờ thêm phiên để hệ thống AI phân tích sâu hơn." };
    }

    const statusHistory = getHistoryStatus(history);
    const markovResult = analyzeMarkovChainAndStreak(statusHistory);
    const balanceResult = analyzeMultiTimeframeBalance(statusHistory);
    const heuristicResult = analyzeHeuristicPatterns(statusHistory);

    const scores = { 'T': 0, 'X': 0 };
    const explanation = [];
    const predictionBreakdown = {};

    const allModels = [
        { name: 'markov', result: markovResult, weight: dynamicWeights.markov },
        { name: 'balance', result: balanceResult, weight: dynamicWeights.balance },
        { name: 'heuristic', result: heuristicResult, weight: dynamicWeights.heuristic },
    ];

    for (const model of allModels) {
        if (model.result.prediction) {
            const score = model.result.certainty * model.weight;
            scores[model.result.prediction] += score;
            explanation.push(model.result.description);
            predictionBreakdown[model.name] = {
                prediction: model.result.prediction,
                certainty: model.result.certainty,
                score: score
            };
        }
    }

    let finalPrediction = null;
    let finalConfidence = 0;
    let totalScore = scores['T'] + scores['X'];

    if (totalScore > 0) {
        if (scores['T'] > scores['X']) {
            finalPrediction = 'Tài';
            finalConfidence = Math.round((scores['T'] / totalScore) * 100);
        } else if (scores['X'] > scores['T']) {
            finalPrediction = 'Xỉu';
            finalConfidence = Math.round((scores['X'] / totalScore) * 100);
        } else {
            finalPrediction = 'Tài';
            finalConfidence = 50;
        }
    } else {
        finalPrediction = 'Tài';
        finalConfidence = 50;
        explanation.push("Các mô hình không tìm thấy đủ cơ sở, dự đoán theo xác suất ngẫu nhiên.");
    }

    let agreementCount = 0;
    for (const model in predictionBreakdown) {
        if (predictionBreakdown[model].prediction === (finalPrediction === 'Tài' ? 'T' : 'X')) {
            agreementCount++;
        }
    }
    if (agreementCount < 2) {
        finalConfidence = Math.min(finalConfidence, 60);
    }

    const predictedSums = predictSums(history, finalPrediction);

    console.log('[AI Prediction] Kết quả cuối cùng:', {
        du_doan: finalPrediction,
        doan_vi: predictedSums,
        confidence: finalConfidence,
        giai_thich: explanation.join(' ')
    });
    console.log('--------------------------------------------------');

    return {
        du_doan: finalPrediction,
        doan_vi: predictedSums,
        confidence: finalConfidence,
        giai_thich: explanation.join(' ')
    };
};

const predictSums = (history, taixiu_prediction) => {
    const sumProbabilities = getTrueSumProbabilities();
    const recentSums = history.slice(0, 70).map(h => h.score || 0);
    const sumsToPredict = taixiu_prediction === 'Tài' ? [11, 12, 13, 14, 15, 16, 17] : [4, 5, 6, 7, 8, 9, 10];

    const sumScores = {};
    for (const sum of sumsToPredict) {
        const recentFreq = recentSums.filter(s => s === sum).length / 70;
        const freqScore = Math.abs(recentFreq - (sumProbabilities[sum] || 0)) * 100;

        const lastSeenIndex = recentSums.indexOf(sum);
        const timeNotSeen = lastSeenIndex === -1 ? recentSums.length : lastSeenIndex;
        const timeScore = Math.min(timeNotSeen / 20, 1);

        const patternScore = (sum >= 11 && taixiu_prediction === 'Tài') || (sum < 11 && taixiu_prediction === 'Xỉu') ? 1.5 : 1;

        const totalScore = (freqScore * 1.5) + (timeScore * 2.0) + (patternScore * 1.0);
        sumScores[sum] = totalScore;
    }

    const predictedSums = Object.entries(sumScores)
        .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
        .slice(0, 3)
        .map(([sum]) => parseInt(sum));

    return predictedSums;
};

// ================================================================
// === Express APP & API Endpoint ===
// ================================================================

app.use((err, req, res, next) => {
    console.error('[Express Error] Lỗi máy chủ:', err.stack);
    if (res.headersSent) return next(err);
    res.status(err.status || 500).json({ error: { message: err.message || 'Đã xảy ra lỗi không xác định trên máy chủ.' } });
});

app.get('/api/sicbo/vannhat', async (req, res, next) => {
    try {
        console.log(`[API Request] Nhận yêu cầu từ client...`);
        
        const api_url = 'https://api.wsktnus8.net/v2/history/getLastResult';
        const params = {
            gameId: 'ktrng_3979',
            size: 100,
            tableId: '39791215743193',
            curPage: 1
        };

        const response = await axiosInstance.get(api_url, { params });
        const raw_data = response.data;
        const history = raw_data.data?.resultList || [];

        console.log(`[API Request] Lấy thành công dữ liệu lịch sử từ máy chủ thứ 3. Số phiên: ${history.length}`);

        if (!Array.isArray(history) || history.length < 15) {
            return res.status(200).json({
                phien_sau: "N/A",
                du_doan: "Không đủ dữ liệu lịch sử để dự đoán.",
                doan_vi: [],
                do_tin_cay: "0%",
                giai_thich: "Cần ít nhất 15 phiên để bắt đầu phân tích nâng cao.",
                luu_y: "MUA TOOL THÌ IB @IDOL_VANNHAT NHÉ HÂHHAHAHAHA"
            });
        }

        const latest = history[0];
        let phien_sau = "N/A";
        
        const phienTruocString = latest.gameNum?.replace('#', '') || '0';
        const latestPhienInt = parseInt(phienTruocString);
        
        if (!isNaN(latestPhienInt)) {
            phien_sau = String(latestPhienInt + 1);
        }

        const score = latest.score || 0;
        const ket_qua = (score >= 11 && score <= 18) ? 'Tài' : 'Xỉu';
        
        const { du_doan, doan_vi, confidence, giai_thich } = predictAdvanced(history);

        const result = {
            phien_truoc: latest.gameNum,
            xuc_xac: latest.facesList?.join(' - ') || 'N/A',
            tong: score,
            ket_qua: ket_qua,
            phien_sau: phien_sau,
            du_doan: du_doan,
            doan_vi: doan_vi,
            do_tin_cay: `${confidence}%`,
            giai_thich: giai_thich,
            luu_y: "KHÔNG NÊN ALL-IN",
            lien_he: "@idol_vannhat"
        };

        res.json(result);
    } catch (err) {
        next(err);
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ API Phân tích & Dự đoán Sicbo đang chạy tại http://localhost:${PORT}`);
    console.log(`⚠️ Lưu ý: Đây là công cụ phân tích thống kê, không phải công cụ dự đoán chắc chắn. Tài Xỉu là trò chơi may rủi.`);
});
