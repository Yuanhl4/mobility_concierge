// Variables to store user selections
let selectedGroupSize = null;
let selectedTimeFlexibility = null;

// Function to handle group size selection
function selectGroupSize(size) {
    console.log('Selected group size:', size);
    selectedGroupSize = size;
    
    // Show the time flexibility bubble
    document.getElementById('time-flexibility-bubble').style.display = 'flex';
}

// Function to handle time flexibility selection
async function selectTimeFlexibility(flexibility) {
    console.log('Selected time flexibility:', flexibility);
    selectedTimeFlexibility = flexibility;
    
    // Now that we have both selections, we can filter and recommend tools
    await recommendToolsWithFilters();
}

// Function to recommend tools with filters
async function recommendToolsWithFilters() {
    try {
        console.log('Recommending tools with filters:');
        console.log('- Group size:', selectedGroupSize);
        console.log('- Time flexibility:', selectedTimeFlexibility);
        
        // Map the selected values to filter values
        const groupSizeFilter = selectedGroupSize === 'single' ? 'single' : 
                               selectedGroupSize === 'group' ? 'group' : null;
        
        const flexibilityFilter = selectedTimeFlexibility === 'very-flexible' ? 'very-flexible' : 
                                 selectedTimeFlexibility === 'somewhat-flexible' ? 'medium' :
                                 selectedTimeFlexibility === 'not-flexible' ? 'not-flexible' : null;
        
        // Create the filters object
        const filters = {};
        if (groupSizeFilter) filters.groupSize = groupSizeFilter;
        if (flexibilityFilter) filters.timeFlexibility = flexibilityFilter;
        
        // Call the backend API with filters
        const response = await fetch('/api/calculate_scores', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                weights: weights,
                filters: filters
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const scoredTools = await response.json();
        console.log('Received scored tools:', scoredTools);
        
        // Display the recommendations
        displayRecommendations(scoredTools);
    } catch (error) {
        console.error('Error in recommendToolsWithFilters:', error);
    }
}

// Function to display recommendations
function displayRecommendations(scoredTools) {
    // Create new recommendation bubble
    const chatContainer = document.querySelector('.chat-container');
    const newRecommendation = document.createElement('div');
    newRecommendation.id = 'recommendation';
    newRecommendation.className = 'chat-bubble';
    
    // Generate HTML for each category
    const generateCategoryHTML = (tools, title) => {
        if (!tools || tools.length === 0) {
            return `
                <div class="recommendation-category">
                    <h3 class="category-title">${title}</h3>
                    <div class="no-recommendations">No recommendations available for this category.</div>
                </div>
            `;
        }
        
        const cardsHTML = tools.map(tool => {
            const toolName = tool.tool.toLowerCase().replace(/\s+/g, '-');
            console.log('Creating card for:', toolName, 'Score:', tool.score);
            
            // Check if this is a fallback recommendation
            const noteHtml = tool.note ? `<div class="tool-note">${tool.note}</div>` : '';
            
            return `
                <div class="card-wrapper">
                    <img src="/static/images/${toolName}-card.png" alt="${tool.tool}">
                    <div class="tool-score">Score: ${Math.round(tool.score * 10) / 10}</div>
                    ${noteHtml}
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
    
    // Set HTML content
    newRecommendation.innerHTML = `
        <img class="avatar" src="/static/images/assistant-avatar.png" alt="Assistant">
        <div class="dialog-box">
            <div class="dialog-title">Based on your preferences, here are recommended tools:</div>
            ${generateCategoryHTML(scoredTools.trip_planning, 'Trip Planning')}
            ${generateCategoryHTML(scoredTools.realtime_info, 'Real-time Information')}
            ${generateCategoryHTML(scoredTools.book_ride, 'Book a Ride')}
        </div>
    `;
    
    // Remove existing recommendation
    const existingRecommendation = document.getElementById('recommendation');
    if (existingRecommendation) {
        existingRecommendation.remove();
    }
    
    // Insert new recommendation before the button scroll container
    chatContainer.insertBefore(newRecommendation, document.querySelector('.button-scroll-container'));
} 