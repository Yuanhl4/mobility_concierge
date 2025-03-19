// 等待 DOM 加载完成
document.addEventListener('DOMContentLoaded', function() {
    // 添加回车键发送功能
    const userInput = document.getElementById('userInput');
    if (userInput) {
        userInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
    
    // 为所有信息选项添加点击事件
    setupInfoOptions();
});

// 设置信息选项的点击事件
function setupInfoOptions() {
    const options = document.querySelectorAll('.info-option');
    options.forEach(option => {
        option.addEventListener('click', function() {
            const category = this.getAttribute('data-category');
            if (category) {
                fetchAndShowAnnouncements(category);
            }
        });
    });
}

// 获取并显示公告
async function fetchAndShowAnnouncements(category) {
    try {
        // 显示加载状态
        showLoadingAnnouncement();
        
        // 发送请求获取公告
        const response = await fetch(`/api/metro_announcements?category=${category}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // 移除所有现有的公告气泡
        removeAllAnnouncementBubbles();
        
        if (data.success && data.announcements && data.announcements.length > 0) {
            // 显示公告
            data.announcements.forEach(announcement => {
                showAnnouncement(announcement);
            });
        } else {
            // 显示无公告信息
            showNoAnnouncementsMessage(category);
        }
    } catch (error) {
        console.error('Error fetching announcements:', error);
        showErrorAnnouncement(error.message);
    }
}

// 显示加载状态
function showLoadingAnnouncement() {
    const chatContainer = document.querySelector('.chat-container');
    
    // 创建加载气泡
    const loadingBubble = document.createElement('div');
    loadingBubble.className = 'chat-bubble announcement-bubble loading-bubble';
    loadingBubble.innerHTML = `
        <img class="avatar" src="/static/images/assistant-avatar.png" alt="Assistant">
        <div class="dialog-box">
            <div class="loading">Loading latest announcements...</div>
        </div>
    `;
    
    // 添加到聊天容器
    chatContainer.appendChild(loadingBubble);
}

// 移除所有公告气泡
function removeAllAnnouncementBubbles() {
    const bubbles = document.querySelectorAll('.announcement-bubble');
    bubbles.forEach(bubble => {
        bubble.remove();
    });
}

// 显示公告
function showAnnouncement(announcement) {
    const chatContainer = document.querySelector('.chat-container');
    
    // 创建公告气泡
    const announcementBubble = document.createElement('div');
    announcementBubble.className = 'chat-bubble announcement-bubble';
    
    // 准备链接HTML
    const linkHtml = announcement.link ? 
        `<div class="announcement-link"><a href="${announcement.link}" target="_blank">View Details</a></div>` : '';
    
    announcementBubble.innerHTML = `
        <img class="avatar" src="/static/images/assistant-avatar.png" alt="Assistant">
        <div class="dialog-box announcement-box">
            <div class="announcement-header">
                <div class="announcement-icon">
                    <svg width="24" height="23" viewBox="0 0 24 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M16.4998 2.99951V7.24951L19.3598 8.93951L18.6098 10.1595L14.9998 7.99951V2.99951H16.4998ZM15.9998 11.9995C17.3598 11.9995 18.5398 11.4995 19.4998 10.5295C20.4998 9.55951 20.9998 8.38951 20.9998 6.99951C20.9998 5.63951 20.4998 4.45951 19.4998 3.49951C18.5398 2.49951 17.3598 1.99951 15.9998 1.99951C14.6098 1.99951 13.4398 2.49951 12.4698 3.49951C11.4998 4.45951 10.9998 5.63951 10.9998 6.99951C10.9998 8.38951 11.4998 9.55951 12.4698 10.5295C13.4398 11.4995 14.6098 11.9995 15.9998 11.9995ZM13.4998 17.9995C13.9398 17.9995 14.2998 17.8395 14.5798 17.5395C14.8598 17.2395 14.9998 16.8895 14.9998 16.4995C14.9998 16.0795 14.8598 15.7295 14.5798 15.4295C14.2998 15.1295 13.9398 14.9995 13.4998 14.9995C13.0598 14.9995 12.6998 15.1295 12.4198 15.4295C12.1398 15.7295 11.9998 16.0795 11.9998 16.4995C11.9998 16.8895 12.1398 17.2395 12.4198 17.5395C12.6998 17.8395 13.0598 17.9995 13.4998 17.9995ZM2.99976 11.9995H11.1098C9.69976 10.6395 8.99976 8.99951 8.99976 6.99951H2.99976V11.9995ZM4.49976 17.9995C4.93976 17.9995 5.29976 17.8395 5.57976 17.5395C5.85976 17.2395 5.99976 16.8895 5.99976 16.4995C5.99976 16.0795 5.85976 15.7295 5.57976 15.4295C5.29976 15.1295 4.93976 14.9995 4.49976 14.9995C4.05976 14.9995 3.69976 15.1295 3.41976 15.4295C3.13976 15.7295 2.99976 16.0795 2.99976 16.4995C2.99976 16.8895 3.13976 17.2395 3.41976 17.5395C3.69976 17.8395 4.05976 17.9995 4.49976 17.9995ZM15.9998 -0.000488281C17.9198 -0.000488281 19.5798 0.669512 20.9498 2.04951C22.3298 3.41951 22.9998 5.07951 22.9998 6.99951C22.9998 8.76951 22.4398 10.2895 21.2798 11.5895C20.1298 12.8795 18.6998 13.6595 16.9998 13.9095V16.9995C16.9998 17.8395 16.6698 18.5795 15.9998 19.1995V20.9995C15.9998 21.2695 15.8898 21.4995 15.6998 21.7095C15.4998 21.9095 15.2798 21.9995 14.9998 21.9995H13.9998C13.7298 21.9995 13.4998 21.9095 13.2898 21.7095C13.1962 21.6167 13.1222 21.5061 13.0724 21.3841C13.0226 21.2621 12.9979 21.1313 12.9998 20.9995V19.9995H4.99976V20.9995C4.99976 21.2695 4.90976 21.4995 4.70976 21.7095C4.49976 21.9095 4.26976 21.9995 3.99976 21.9995H2.99976C2.71976 21.9995 2.49976 21.9095 2.29976 21.7095C2.10976 21.4995 1.99976 21.2695 1.99976 20.9995V19.1995C1.32976 18.5795 0.999756 17.8395 0.999756 16.9995V6.99951C0.999756 5.41951 1.66976 4.34951 3.04976 3.79951C4.41976 3.25951 6.40976 2.99951 8.99976 2.99951H9.60976C9.88976 2.99951 10.0898 3.02951 10.2198 3.02951C11.6298 0.999512 13.5498 -0.000488281 15.9998 -0.000488281Z" fill="black"/>
                    </svg>
                </div>
                <div class="announcement-content">
                    <div class="announcement-title">
                        <span class="main-title">${announcement.title}</span>
                        <span class="sub-title">${announcement.subtitle}</span>
                    </div>
                    <div class="announcement-description">
                        ${announcement.description}
                    </div>
                    <div class="announcement-meta">
                        Posted on ${announcement.date}<br/>
                        Source: ${announcement.source}
                        ${linkHtml}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 添加到聊天容器
    chatContainer.appendChild(announcementBubble);
}

// 显示无公告信息
function showNoAnnouncementsMessage(category) {
    const chatContainer = document.querySelector('.chat-container');
    
    // 创建无公告气泡
    const noBubble = document.createElement('div');
    noBubble.className = 'chat-bubble announcement-bubble';
    noBubble.innerHTML = `
        <img class="avatar" src="/static/images/assistant-avatar.png" alt="Assistant">
        <div class="dialog-box">
            <div class="ai-message">
                <strong>No Recent Information</strong><br/>
                There are currently no recent announcements in the ${category} category. 
                Please check back later or visit the King County Metro website for more information.
            </div>
        </div>
    `;
    
    // 添加到聊天容器
    chatContainer.appendChild(noBubble);
}

// 显示错误信息
function showErrorAnnouncement(errorMessage) {
    const chatContainer = document.querySelector('.chat-container');
    
    // 创建错误气泡
    const errorBubble = document.createElement('div');
    errorBubble.className = 'chat-bubble announcement-bubble';
    errorBubble.innerHTML = `
        <img class="avatar" src="/static/images/assistant-avatar.png" alt="Assistant">
        <div class="dialog-box">
            <div class="ai-message">
                <strong>Error Retrieving Announcements</strong><br/>
                We are unable to connect to the King County Metro website. 
                Please try again later or visit their website directly.
                <br/><small>Error details: ${errorMessage}</small>
            </div>
        </div>
    `;
    
    // 添加到聊天容器
    chatContainer.appendChild(errorBubble);
}

async function sendMessage() {
    const input = document.getElementById('userInput');
    const message = input.value.trim();
    if (!message) return;

    try {
        // 添加用户消息到聊天界面
        const chatContainer = document.querySelector('.chat-container');
        
        if (!chatContainer) {
            throw new Error('Chat container not found');
        }

        const userBubble = document.createElement('div');
        userBubble.className = 'chat-bubble user';
        userBubble.innerHTML = `
            <div class="dialog-box">
                <div class="user-message">${message}</div>
            </div>
        `;
        // 直接添加到聊天容器末尾
        chatContainer.appendChild(userBubble);

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
        // 直接添加到聊天容器末尾
        chatContainer.appendChild(loadingBubble);

        // 发送请求到后端
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                context: 'information'
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

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
            // 直接添加到聊天容器末尾
            chatContainer.appendChild(aiBubble);
        } else {
            throw new Error(data.error || 'Failed to get response');
        }
    } catch (error) {
        console.error('Error in sendMessage:', error);
        alert(`Error: ${error.message}`);
    }
} 