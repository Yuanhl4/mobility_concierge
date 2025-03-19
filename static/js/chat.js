async function selectTripType(type) {
    try {
        // 获取推荐工具
        const recommendedTools = await recommendTools();
        console.log('Recommended tools:', recommendedTools);
        
        // 创建新的推荐气泡
        const chatContainer = document.querySelector('.chat-container');
        const newRecommendation = document.createElement('div');
        newRecommendation.id = 'recommendation';
        newRecommendation.className = 'chat-bubble';
        
        // 生成所有类别的推荐卡片HTML
        const generateCategoryHTML = (tools, title) => {
            const cardsHTML = tools.map(tool => {
                const toolName = tool.tool.toLowerCase().replace(/\s+/g, '-');
                console.log('Creating card for:', toolName, 'Score:', tool.score);
                return `
                    <div class="card-wrapper">
                        <img src="/static/images/${toolName}-card.png" alt="${tool.tool}">
                        <div class="tool-score">Score: ${Math.round(tool.score * 10) / 10}</div>
                        <a href="#" class="get-app-btn">Get App</a>
                    </div>
                `;
            }).join('');
            
            return `
                <div class="recommendation-category">
                    <h3 class="category-title">${title}</h3>
                    <div class="cards-scroll">
                        ${cardsHTML}
                    </div>
                </div>
            `;
        };
        
        // 设置HTML内容
        newRecommendation.innerHTML = `
            <img class="avatar" src="/static/images/assistant-avatar.png" alt="Assistant">
            <div class="dialog-box">
                <div class="dialog-title">${getRecommendationTitle(type)}</div>
                ${generateCategoryHTML(recommendedTools.trip_planning, 'Trip Planning')}
                ${generateCategoryHTML(recommendedTools.realtime_info, 'Real-time Information')}
                ${generateCategoryHTML(recommendedTools.book_ride, 'Book a Ride')}
            </div>
        `;
        
        // 移除现有推荐
        const existingRecommendation = document.getElementById('recommendation');
        if (existingRecommendation) {
            existingRecommendation.remove();
        }
        
        // 插入新推荐
        chatContainer.insertBefore(newRecommendation, document.querySelector('.input-container'));
    } catch (error) {
        console.error('Error in selectTripType:', error);
    }
}

async function sendMessage() {
    const input = document.getElementById('userInput');
    const message = input.value.trim();
    if (!message) return;

    try {
        // 添加用户消息到聊天界面
        const chatContainer = document.querySelector('.chat-container');
        const userBubble = document.createElement('div');
        userBubble.className = 'chat-bubble user';
        userBubble.innerHTML = `
            <div class="dialog-box">
                <div class="user-message">${message}</div>
            </div>
        `;
        chatContainer.insertBefore(userBubble, document.querySelector('.input-container'));

        // 清空输入框
        input.value = '';

        // 显示加载状态
        const loadingBubble = document.createElement('div');
        loadingBubble.className = 'chat-bubble';
        loadingBubble.innerHTML = `
            <img class="avatar" src="/static/images/assistant-avatar.png" alt="Assistant">
            <div class="dialog-box">
                <div class="loading">Thinking...</div>
            </div>
        `;
        chatContainer.insertBefore(loadingBubble, document.querySelector('.input-container'));

        // 发送请求到后端
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                context: 'personalized_tools'
            })
        });

        const data = await response.json();

        // 移除加载状态
        loadingBubble.remove();

        // 添加 AI 回复
        if (data.success) {
            const aiBubble = document.createElement('div');
            aiBubble.className = 'chat-bubble';
            aiBubble.innerHTML = `
                <img class="avatar" src="/static/images/assistant-avatar.png" alt="Assistant">
                <div class="dialog-box">
                    <div class="ai-message">${data.message}</div>
                </div>
            `;
            chatContainer.insertBefore(aiBubble, document.querySelector('.input-container'));
        } else {
            throw new Error(data.error || 'Failed to get response');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Sorry, something went wrong. Please try again.');
    }
}

// 添加回车键发送功能
document.getElementById('userInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// 工具推荐算法
async function recommendTools() {
    try {
        // 调用后端API计算分数
        const response = await fetch('/api/calculate_scores', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(weights)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const scoredTools = await response.json();
        
        // 打印所有工具的得分排名
        console.log('\n=== Tools Ranking by Category ===');
        
        ['trip_planning', 'realtime_info', 'book_ride'].forEach(category => {
            console.log(`\n${category.toUpperCase()}:`);
            scoredTools[category].forEach((tool, index) => {
                console.log(`${index + 1}. ${tool.tool.padEnd(15)} Score: ${tool.score.toFixed(2)}`);
                console.log('  Details:');
                for (const [key, value] of Object.entries(tool.details)) {
                    console.log(`    ${key.padEnd(12)}: ${value.toFixed(2)}`);
                }
            });
        });
        
        console.log('\n=====================\n');
        
        // 返回所有类别的工具
        return scoredTools;
    } catch (error) {
        console.error('Error in recommendTools:', error);
        return {
            trip_planning: [],
            realtime_info: [],
            book_ride: []
        };
    }
}

// 解析CSV数据
function parseCSV(csvText) {
    const lines = csvText.split('\n');
    
    return lines.slice(1)  // 跳过表头
        .filter(line => line.trim())
        .map(line => {
            // 处理CSV中的引号和逗号
            const values = line.split(',').map(val => val.trim().replace(/^"|"$/g, ''));
            
            // 确保数值正确解析
            const tool = {
                tool: values[1],
                introduction: values[2],
                cost: parseInt(values[3]) || 0,
                time: parseInt(values[4]) || 0,
                safety: parseInt(values[5]) || 0,
                lessTransfer: parseInt(values[6]) || 0,
                lessWalking: parseInt(values[7]) || 0
            };
            
            // 验证数值是否正确解析
            console.log(`Parsing ${tool.tool}:`, {
                cost: tool.cost,
                time: tool.time,
                safety: tool.safety,
                lessTransfer: tool.lessTransfer,
                lessWalking: tool.lessWalking
            });
            
            return tool;
        })
        .filter(tool => tool !== null);
}

// 计算工具得分
function calculateToolScore(tool) {
    const calculations = {
        safety: (tool.safety || 0) * weights.safety,
        cost: (tool.cost || 0) * weights.cost,
        lessTransfer: (tool.lessTransfer || 0) * weights.lessTransfer,
        time: (tool.time || 0) * weights.time,
        lessWalking: (tool.lessWalking || 0) * weights.lessWalking
    };
    
    const score = Object.values(calculations).reduce((sum, val) => sum + val, 0);
    
    // 打印详细的得分计算过程
    console.log(`
Score calculation for ${tool.tool}:
    Safety (${tool.safety} × ${weights.safety})         = ${calculations.safety}
    Cost (${tool.cost} × ${weights.cost})              = ${calculations.cost}
    LessTransfer (${tool.lessTransfer} × ${weights.lessTransfer}) = ${calculations.lessTransfer}
    Time (${tool.time} × ${weights.time})              = ${calculations.time}
    LessWalking (${tool.lessWalking} × ${weights.lessWalking})    = ${calculations.lessWalking}
    ------------------------------------------------
    Total Score                                         = ${score}
`);
    
    return score;
}

// 显示/隐藏弹窗
function toggleRankingModal() {
    const modal = document.getElementById('rankingModal');
    if (!modal) return;
    
    if (modal.style.display !== 'flex') {
        // 显示弹窗
        modal.style.display = 'flex';
        
        // 2秒后自动关闭
        setTimeout(() => {
            modal.style.display = 'none';
        }, 2000);
    } else {
        // 直接关闭弹窗
        modal.style.display = 'none';
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    // 不再需要确认按钮的事件监听
    const modal = document.getElementById('rankingModal');
    if (modal) {
        // 确保初始状态是隐藏的
        modal.style.display = 'none';
    }
});

// 获取推荐标题
function getRecommendationTitle(type) {
    switch(type) {
        case 'regular':
            return 'For your regular commute, here are some helpful tools:';
        case 'entertainment':
            return 'For entertainment trips, you might like these:';
        case 'non-repeting':
            return 'For your one-time trip, consider these tools:';
        default:
            return 'Here are some recommended tools for you:';
    }
} 