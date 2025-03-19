# Metro Concierge

Metro Concierge is an intelligent transportation assistant that helps users find the best transportation tools based on their preferences and needs.

## Features

- Personalized tool recommendations based on group size and time flexibility
- Real-time transit information and announcements
- Interactive travel helper with route planning
- Information center with categorized transit resources

## Prerequisites

- Python 3.8 or higher
- Flask web framework
- OpenAI API key
- Google Maps API key

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd metro_concierge
   ```

2. Create and activate a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows, use: venv\Scripts\activate
   ```

3. Install the required dependencies:
   ```
   pip install -r requirements.txt
   ```

## Configuration

### OpenAI API Key

1. Open the `app.py` file
2. Locate line 16, which contains:
   ```python
   client = OpenAI(api_key="your_api_key_here")
   ```
3. Replace `"your_api_key_here"` with your actual OpenAI API key

### Google Maps API Key

1. Open the file `static/js/helper.js`
2. Locate line 1, which contains:
   ```javascript
   const GOOGLE_MAPS_API_KEY = 'AIzaSyC5FDWfr1gBDQxNTmPWKuKKs17Zjyc0quM';
   ```
3. Replace the API key with your own Google Maps API key

## Running the Application

1. Ensure you're in the project directory with the virtual environment activated
2. Start the Flask application:
   ```
   python app.py
   ```
3. Open a web browser and navigate to:
   ```
   http://localhost:5001/
   ```

## Project Structure

- `app.py`: Main Flask application
- `static/`: Contains CSS, JavaScript, and image files
- `templates/`: HTML templates for the web interface
- `static/css/Recommended Tools - Sheet1.csv`: Data source for tool recommendations

## Usage

1. Visit the personalized tools page to get customized transportation recommendations
2. Use the travel helper for planning routes and getting directions
3. Check the information center for transit announcements and resources
4. Explore additional capabilities in the "More" section

## License

[Include license information here]

## Acknowledgements

- King County Metro
- OpenAI
- Google Maps Platform 