from flask import Flask, render_template, url_for, request, jsonify, send_file
import time
from openai import OpenAI
import csv
import json
import requests
from bs4 import BeautifulSoup
from datetime import datetime

app = Flask(__name__)

# 添加版本号
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
VERSION = str(int(time.time()))

# 初始化 OpenAI 客户端
client = OpenAI(api_key="your_api_key_here")
@app.context_processor
def inject_version():
    return dict(version=VERSION)

@app.route('/')
def chat():
    return render_template('chat.html')

@app.route('/personalized')
def personalized():
    return render_template('personalized.html')

@app.route('/helper')
def helper():
    return render_template('helper.html')

@app.route('/information')
def info():
    return render_template('info.html')

@app.route('/more')
def more():
    return render_template('more.html')

@app.route('/api/chat', methods=['POST'])
def chat_api():
    try:
        user_message = request.json.get('message')
        context = request.json.get('context', '')
        
        # 根据上下文设置系统提示词
        if context == 'personalized_tools':
            system_prompt = """
            You are an experienced and patient King County Metro customer service staff. 
            Your goal is to provide professional and tai red trip planning suggestions to users. 

            Respond in the following structured format:

            1. Route General Introduction (Bold, 18 size front for title):
                 - in 30 words, seperate steps in lines for users easy to read.
                 - Departure point and transport mode (e.g., "Take Bus #45 from University of Washington").
                 - Transfers (e.g., "Switch to Metro Line 1 at XYZ Station").
                 - like form A (Bold) to B (Bold), by ? (Underlind), then to C (Bold), by ? (Underlined) and so on, but this is not fixed.

            2. Extra Suggestions (Bold, 18 size front for title):
                 - be short, all in 30 words, seperate steps in lines for users easy to read.
                 - Provide specific advice tailored to the user's trip features and profile, presented as clear bullet points:
                 - Safety tips (if not needed, do not mention. e.g., "Sit near the driver or in busy sections of the bus/metro for added security").
                 - Payment advice (if not needed, do not mention. e.g., "Use an ORCA card for seamless payment").
                 - Scenic recommendations (if not needed, do not mention e.g., "If you have time, enjoy a short walk at XYZ Park").
                 - Accessibility tips (if not needed, do not mention e.g., "This route is wheelchair-friendly with low-floor buses").
            
            3. Return the route with information of all possible transit officialwebsite and link, so users will be able to buy the ticket
            and check the real-time information
                - transportation method
                - 
            """
        else:
            system_prompt = "You are a helpful assistant."

        # 调用 OpenAI API
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ]
        )
        
        ai_response = response.choices[0].message.content
        
        return jsonify({
            "success": True,
            "message": ai_response
        })
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/select_trip_type', methods=['POST'])
def select_trip_type():
    trip_type = request.json.get('type')
    return jsonify({
        "success": True,
        "message": "Recommendation received"
    })

@app.route('/static/css/Recommended Tools  - Sheet1.csv')
def get_tools_data():
    return send_file('static/css/Recommended Tools  - Sheet1.csv', mimetype='text/csv')

@app.route('/api/calculate_scores', methods=['POST'])
def calculate_scores():
    weights = request.json.get('weights', {})
    filters = request.json.get('filters', {})
    
    scores = calculate_all_scores(weights, filters)
    
    print("\n=== Tool Scores by Category ===")
    
    print("\nTrip Planning Tools:")
    for tool in scores['trip_planning']:
        print(f"{tool['tool'].ljust(15)} Score: {tool['score']:.2f}")
    
    print("\nReal-time Information Tools:")
    for tool in scores['realtime_info']:
        print(f"{tool['tool'].ljust(15)} Score: {tool['score']:.2f}")
    
    print("\nBook a Ride Tools:")
    for tool in scores['book_ride']:
        print(f"{tool['tool'].ljust(15)} Score: {tool['score']:.2f}")
    
    print("\n==========================\n")
    
    return jsonify(scores)

def calculate_all_scores(weights, filters=None):
    try:
        with open('static/css/Recommended Tools  - Sheet1.csv', 'r') as file:
            reader = csv.DictReader(file)
            tools = []
            # Group tools by service type
            trip_planning_tools = []
            realtime_info_tools = []
            book_ride_tools = []
            
            # Store all book_ride tools before filtering
            all_book_ride_tools = []
            
            for row in reader:
                # Calculate score first (needed for both filtered and unfiltered tools)
                score = (
                    float(row['Safety']) * weights.get('safety', 1) +
                    float(row['Cost']) * weights.get('cost', 1) +
                    float(row['less transfer']) * weights.get('lessTransfer', 1) +
                    float(row['Time']) * weights.get('time', 1) +
                    float(row['less walking']) * weights.get('lessWalking', 1)
                )
                
                tool_info = {
                    'tool': row['Tool'],
                    'score': score,
                    'type': row['type of service'],
                    'details': {
                        'safety': float(row['Safety']) * weights.get('safety', 1),
                        'cost': float(row['Cost']) * weights.get('cost', 1),
                        'lessTransfer': float(row['less transfer']) * weights.get('lessTransfer', 1),
                        'time': float(row['Time']) * weights.get('time', 1),
                        'lessWalking': float(row['less walking']) * weights.get('lessWalking', 1)
                    },
                    'flexibility': row['flexibility rating'],
                    'singleOrGroup': row['sigle or group']
                }
                
                # Store all book_ride tools before filtering
                if row['type of service'].strip().lower() == 'book a ride':
                    all_book_ride_tools.append(tool_info)
                
                # Apply filters if provided
                if filters:
                    # Filter by group size
                    if 'groupSize' in filters:
                        if filters['groupSize'] == 'single' and row['sigle or group'].strip().lower() == 'group':
                            continue
                        if filters['groupSize'] == 'group' and row['sigle or group'].strip().lower() == 'single':
                            continue
                    
                    # Filter by time flexibility
                    if 'timeFlexibility' in filters:
                        if filters['timeFlexibility'] == 'very-flexible' and row['flexibility rating'].strip().lower() == 'low':
                            continue
                        if filters['timeFlexibility'] == 'not-flexible' and row['flexibility rating'].strip().lower() == 'high':
                            continue
                
                # Categorize by service type
                if row['type of service'].strip().lower() == 'trip planning':
                    trip_planning_tools.append(tool_info)
                elif row['type of service'].strip().lower() == 'real-time information':
                    realtime_info_tools.append(tool_info)
                elif row['type of service'].strip().lower() == 'book a ride':
                    book_ride_tools.append(tool_info)
            
            # Sort each category by score and get the top 3
            trip_planning_top3 = sorted(trip_planning_tools, key=lambda x: x['score'], reverse=True)[:3]
            realtime_info_top3 = sorted(realtime_info_tools, key=lambda x: x['score'], reverse=True)[:3]
            book_ride_top3 = sorted(book_ride_tools, key=lambda x: x['score'], reverse=True)[:3]
            
            # If book_ride_tools is empty after filtering, use the top 3 from all_book_ride_tools
            if not book_ride_top3 and all_book_ride_tools:
                print("No Book a Ride tools matched the filters. Using top 3 from all Book a Ride tools.")
                book_ride_top3 = sorted(all_book_ride_tools, key=lambda x: x['score'], reverse=True)[:3]
                # Add a note to indicate these are fallback recommendations
                for tool in book_ride_top3:
                    tool['note'] = "May not fully match your group size or flexibility preferences"
            
            # Print detailed calculation results
            print("\n=== Trip Planning Tools Ranking ===")
            for tool in trip_planning_tools:
                print(f"{tool['tool'].ljust(15)} Score: {tool['score']:.2f}")
                
            print("\n=== Real-time Information Tools Ranking ===")
            for tool in realtime_info_tools:
                print(f"{tool['tool'].ljust(15)} Score: {tool['score']:.2f}")
                
            print("\n=== Book a Ride Tools Ranking ===")
            for tool in book_ride_tools:
                print(f"{tool['tool'].ljust(15)} Score: {tool['score']:.2f}")
            
            if not book_ride_tools and all_book_ride_tools:
                print("\n=== Fallback Book a Ride Tools Ranking ===")
                for tool in book_ride_top3:
                    print(f"{tool['tool'].ljust(15)} Score: {tool['score']:.2f} (Fallback)")
            
            return {
                'trip_planning': trip_planning_top3,
                'realtime_info': realtime_info_top3,
                'book_ride': book_ride_top3
            }
            
    except Exception as e:
        print(f"Error calculating scores: {e}")
        return []

@app.route('/api/metro_announcements', methods=['GET'])
def get_metro_announcements():
    category = request.args.get('category', 'all')
    try:
        # 获取King County Metro公告
        announcements = fetch_metro_announcements(category)
        return jsonify({
            "success": True,
            "announcements": announcements
        })
    except Exception as e:
        print(f"Error fetching announcements: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

def fetch_metro_announcements(category='all'):
    """
    Fetch information based on different categories
    """
    try:
        announcements = []
        
        if category == 'payment':
            # Payment - direct summary content and links
            announcements.append({
                "title": "ORCA Card",
                "subtitle": "Payment Option",
                "description": "ORCA cards are the easiest way to pay for transit in the Puget Sound region. Load value or passes onto your card and tap to pay on buses, trains, ferries, and more.",
                "date": datetime.now().strftime("%b %d, %Y"),
                "source": "King County Metro",
                "link": "https://kingcounty.gov/en/dept/metro/fares-and-payment/ways-to-pay"
            })
            
            announcements.append({
                "title": "Transit GO Ticket App",
                "subtitle": "Payment Option",
                "description": "Buy and use transit tickets on your smartphone. Available for King County Metro, Sound Transit, Seattle Streetcar, and more.",
                "date": datetime.now().strftime("%b %d, %Y"),
                "source": "King County Metro",
                "link": "https://kingcounty.gov/en/dept/metro/fares-and-payment/ways-to-pay"
            })
            
            announcements.append({
                "title": "Cash Payment",
                "subtitle": "Payment Option",
                "description": "Pay with exact fare when you board. Drivers don't carry change. Adult fare is $2.75.",
                "date": datetime.now().strftime("%b %d, %Y"),
                "source": "King County Metro",
                "link": "https://kingcounty.gov/en/dept/metro/fares-and-payment/ways-to-pay"
            })
            
        elif category == 'travel':
            # Travel Recommendations - get latest events from Seattle Events
            try:
                # Event data extracted from our curl request
                events = [
                    {
                        "title": "2025 NCAA Division I Men's Basketball First + Second Rounds",
                        "subtitle": "Event Recommendation",
                        "description": "Experience March Madness in Seattle at Climate Pledge Arena!",
                        "date": "Mar 21-23, 2025",
                        "source": "Visit Seattle",
                        "link": "https://www.climatepledgearena.com/event/2025-ncaa-division-i-mens-basketball-first-and-second-rounds/"
                    },
                    {
                        "title": "French Baroque Trio Sonatas with Musica Alta Ripa",
                        "subtitle": "Event Recommendation",
                        "description": "Features harpsichordist Bernward Lohr and baroque violinist Anne Rohrig at Faith Lutheran Church.",
                        "date": "Mar 13, 2025",
                        "source": "Visit Seattle",
                        "link": "https://www.salishseafestival.org/seattle"
                    },
                    {
                        "title": "A New Look at Photo History: Treasures from the Solander Collection",
                        "subtitle": "Event Recommendation",
                        "description": "Featuring a selection of 50 extraordinary works at Photographic Center Northwest.",
                        "date": "Now through Mar 20, 2025",
                        "source": "Visit Seattle",
                        "link": "https://pcnw.org/gallery/exhibitions/a-new-look-at-photo-history-treasures-from-the-solander-collection/"
                    }
                ]
                
                announcements.extend(events)
            except Exception as e:
                print(f"Error fetching Seattle events: {e}")
                # Provide some default recommendations if unable to get events
                announcements.append({
                    "title": "Space Needle",
                    "subtitle": "Tourist Attraction",
                    "description": "Visit Seattle's iconic Space Needle for panoramic views of the city, Puget Sound, and surrounding mountains.",
                    "date": datetime.now().strftime("%b %d, %Y"),
                    "source": "Travel Recommendation",
                    "link": "https://www.spaceneedle.com/"
                })
                
                announcements.append({
                    "title": "Pike Place Market",
                    "subtitle": "Tourist Attraction",
                    "description": "Explore one of the oldest continuously operated public farmers' markets in the United States, featuring local vendors, craftspeople, and the famous fish-throwing tradition.",
                    "date": datetime.now().strftime("%b %d, %Y"),
                    "source": "Travel Recommendation",
                    "link": "https://www.pikeplacemarket.org/"
                })
                
                announcements.append({
                    "title": "Museum of Pop Culture (MoPOP)",
                    "subtitle": "Tourist Attraction",
                    "description": "Dedicated to contemporary popular culture, with exhibits focusing on music, science fiction, and more in a striking Frank Gehry-designed building.",
                    "date": datetime.now().strftime("%b %d, %Y"),
                    "source": "Travel Recommendation",
                    "link": "https://www.mopop.org/"
                })
            
        elif category == 'announcements':
            # Announcements - provide latest traffic announcements from KCM
            announcements.append({
                "title": "Route 40 - Temporary Reroute",
                "subtitle": "Service Advisory",
                "description": "Due to construction on Westlake Ave N, Route 40 is temporarily rerouted via Dexter Ave N in both directions until further notice.",
                "date": datetime.now().strftime("%b %d, %Y"),
                "source": "King County Metro",
                "link": "https://kingcounty.gov/en/dept/metro/rider-tools/service-advisories"
            })
            
            announcements.append({
                "title": "RapidRide G Line Construction",
                "subtitle": "Service Advisory",
                "description": "Construction for the new RapidRide G Line is underway on Madison Street. Expect delays and detours in the area.",
                "date": datetime.now().strftime("%b %d, %Y"),
                "source": "King County Metro",
                "link": "https://kingcounty.gov/en/dept/metro/rider-tools/service-advisories"
            })
            
            announcements.append({
                "title": "Spring Service Changes",
                "subtitle": "Service Advisory",
                "description": "Metro's spring service changes will take effect on March 18, 2025. Check your route for updated schedules and possible changes.",
                "date": datetime.now().strftime("%b %d, %Y"),
                "source": "King County Metro",
                "link": "https://kingcounty.gov/en/dept/metro/rider-tools/service-advisories"
            })
            
        elif category == 'safety':
            # Safety - provide safety announcements
            announcements.append({
                "title": "Transit Safety Campaign",
                "subtitle": "Safety Advisory",
                "description": "King County Metro has launched a new safety campaign focusing on passenger awareness and reporting suspicious activities.",
                "date": datetime.now().strftime("%b %d, %Y"),
                "source": "King County Metro",
                "link": "https://kingcounty.gov/en/dept/metro/rider-tools/service-advisories"
            })
            
            announcements.append({
                "title": "Emergency Preparedness",
                "subtitle": "Safety Advisory",
                "description": "Metro is conducting emergency preparedness drills throughout the system. Learn what to do in case of emergency on transit.",
                "date": datetime.now().strftime("%b %d, %Y"),
                "source": "King County Metro",
                "link": "https://kingcounty.gov/en/dept/metro/rider-tools/service-advisories"
            })
            
            announcements.append({
                "title": "Transit Security Patrols Increased",
                "subtitle": "Safety Advisory",
                "description": "Metro has increased security patrols on routes and at transit centers during evening and overnight hours.",
                "date": datetime.now().strftime("%b %d, %Y"),
                "source": "King County Metro",
                "link": "https://kingcounty.gov/en/dept/metro/rider-tools/service-advisories"
            })
            
        elif category == 'accessibility':
            # Accessibility - directly list accessible stations served by KCM
            accessibility_stations = [
                {
                    "title": "Downtown Seattle Transit Tunnel Stations",
                    "subtitle": "Accessible Stations",
                    "description": "All stations in the Downtown Seattle Transit Tunnel are fully accessible with elevators, escalators, and tactile pathways. Includes Westlake, University Street, Pioneer Square, and International District stations.",
                    "date": datetime.now().strftime("%b %d, %Y"),
                    "source": "King County Metro",
                    "link": "https://kingcounty.gov/en/dept/metro/access-services"
                },
                {
                    "title": "RapidRide Stations",
                    "subtitle": "Accessible Stations",
                    "description": "All RapidRide stations (Lines A-F) feature accessible boarding platforms, real-time arrival information, and well-lit waiting areas.",
                    "date": datetime.now().strftime("%b %d, %Y"),
                    "source": "King County Metro",
                    "link": "https://kingcounty.gov/en/dept/metro/access-services"
                },
                {
                    "title": "Transit Centers",
                    "subtitle": "Accessible Stations",
                    "description": "Major transit centers including Bellevue, Northgate, Aurora Village, Federal Way, and Burien are fully accessible with ramps, tactile surfaces, and accessible restrooms where available.",
                    "date": datetime.now().strftime("%b %d, %Y"),
                    "source": "King County Metro",
                    "link": "https://kingcounty.gov/en/dept/metro/access-services"
                },
                {
                    "title": "Link Light Rail Stations",
                    "subtitle": "Accessible Stations",
                    "description": "All Sound Transit Link Light Rail stations are fully accessible with elevators, escalators, and level boarding platforms.",
                    "date": datetime.now().strftime("%b %d, %Y"),
                    "source": "Sound Transit",
                    "link": "https://www.soundtransit.org/ride-with-us/accessibility"
                },
                {
                    "title": "Access Transportation",
                    "subtitle": "Paratransit Service",
                    "description": "King County Metro offers Access Transportation, a paratransit service for people who are unable to use regular bus service due to a disability. Call 206-263-3113 for eligibility information.",
                    "date": datetime.now().strftime("%b %d, %Y"),
                    "source": "King County Metro",
                    "link": "https://kingcounty.gov/en/dept/metro/access-services"
                }
            ]
            
            announcements.extend(accessibility_stations)
        
        # If no announcements found, return a default announcement
        if not announcements:
            announcements.append({
                "title": "No Recent Information",
                "subtitle": category.capitalize(),
                "description": "There is no recent information in this category. Please check back later or visit the King County Metro website for more information.",
                "date": datetime.now().strftime("%b %d, %Y"),
                "source": "King County Metro",
                "link": "https://kingcounty.gov/en/dept/metro"
            })
            
        return announcements
        
    except Exception as e:
        print(f"Error fetching information for {category}: {e}")
        # Return an error announcement
        return [{
            "title": "Unable to Fetch Information",
            "subtitle": "Error",
            "description": f"We're having trouble retrieving the requested information. Please try again later or visit the King County Metro website directly.",
            "date": datetime.now().strftime("%b %d, %Y"),
            "source": "System Message",
            "link": "https://kingcounty.gov/en/dept/metro"
        }]

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
