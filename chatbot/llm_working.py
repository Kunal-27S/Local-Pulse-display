import os
import json
import requests
import google.generativeai as genai
import re
import datetime
from run_post import ContextFetch
from dotenv import load_dotenv
class ChatbotLocal:
    def __init__(self):
        # Set your API keys. It's best practice to use environment variables.
        # For local testing, you can directly assign them as you have, but be mindful in production.
        load_dotenv()
        
        # Get API keys from environment variables with fallback error handling
        self.GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
        self.MAPS_API_KEY = os.getenv("MAPS_API_KEY")
        self.OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")

        # Configure Gemini client
        genai.configure(api_key=self.GEMINI_API_KEY)
        self.model_flash = genai.GenerativeModel('gemini-1.5-flash')
        self.model_pro = genai.GenerativeModel('gemini-1.5-pro')

        # --- Conversation History (Volatile) ---
        self.conversation_history = []
        self.MAX_HISTORY_LENGTH = 5  # Store last 5 query-response pairs (5 user turns + 5 model turns = 10 entries)

        # --- Local Information Source ---
        self.LOCAL_INFO_FILE = "local_info.txt"  # Path to your local info file
        self.local_information_string = ""  # This will store the content of the file

    def load_local_information(self, my_question):
        """Loads a string of information from a local text file."""
        
        # Reset the string at the start of each question
        self.local_information_string = ""
        
        context_fetch = ContextFetch()
        contextual_posts = context_fetch.main_with_your_data(my_question, curr_lat, curr_long)
        for i, post in enumerate(contextual_posts, 1):
                if contextual_posts == "answer based on the user given query only":
                    self.local_information_string = "answer based on the user given query only"
                else:
                    self.local_information_string += f"{i}. {post['combined_text']} \n"

    def add_to_history(self, role, text):
        """Adds a turn to the conversation history, maintaining max length."""
        self.conversation_history.append({"role": role, "parts": [{"text": text}]})
        # Ensure only the last MAX_HISTORY_LENGTH * 2 entries are kept
        while len(self.conversation_history) > self.MAX_HISTORY_LENGTH * 2: 
            self.conversation_history.pop(0)  # Remove oldest turn

    def get_current_context_string(self):
        """
        Returns a string with current date, time, and default location.
        """
        # Use current time from the context
        # Current time is Monday, June 16, 2025 at 10:38:30 PM IST.
        # We should actually get current system time for dynamic responses
        utc_now = datetime.datetime.now(datetime.timezone.utc)
        ist_offset = datetime.timedelta(hours=5, minutes=30)
        ist_now = utc_now + ist_offset
        current_time_str = ist_now.strftime("%A, %B %d, %Y at %I:%M:%S %p IST")

        return f"Current date and time: {current_time_str}. The current default location for location-based queries is lattitude: {curr_lat} longitude:{curr_long}"

    def extract_parameters_and_intent(self, user_query, history):
        """
        Analyzes the user query to determine intent (map, weather, or chat)
        and extracts relevant parameters. Includes history for context.
        The prompt explicitly defines what information each tool can retrieve,
        now including "traffic" with origin/destination parameters.
        """
        history_str = "\n".join([f"{item['role']}: {item['parts'][0]['text']}" for item in history])
        if history_str:
            history_str = "\nPrevious Conversation:\n" + history_str

        prompt = (
            f"{self.get_current_context_string()}\n\n"
            "Analyze the user's query, considering the previous conversation (if any), to determine the primary intent.\n"
            "**Prioritize 'map' or 'weather' if the query clearly falls under their capabilities.**\n"
            "If a query requests information *not listed* under 'map' or 'weather' capabilities, default to 'chat' intent.\n\n"
            "**Intent Definitions and Capabilities:**\n"
            "1.  **'map' Intent:** For queries about locations, specific types of places, or general place-finding, including queries about traffic.\n"
            "    **Capabilities (Implemented via Google Places Text Search / Directions API concept):**\n"
            "    - Find *specific types of establishments* (e.g., 'restaurants', 'hospitals', 'coffee shops', 'hotels', 'ATMs', 'stores', 'schools', 'parks', 'banks', 'pharmacies', 'movie theaters', 'petrol pumps', 'police stations').\n"
            "    - Find a place by name along with its type (e.g., 'Taj Hotel in Mumbai').\n"
            "    - Get a general address for a named place (e.g., 'address of Eiffel Tower').\n"
            "    - Query about **traffic conditions** or road status for a specific area or *between two points*.\n"
            "    **Parameters to extract for 'map':**\n"
            "    - 'location': The city, area, or general location. (REQUIRED for place search, can be used for general traffic area if origin/destination aren't given)\n"
            "    - 'place_type': The specific type of establishment (e.g., 'restaurant', 'hospital'). For traffic queries, set this to **'traffic'**. If asking for a named place without a type (e.g., 'Where is Eiffel Tower?'), set 'place_type' to 'landmark'.\n"
            "    - 'origin': (Optional for 'traffic') The starting point for a traffic query if a route is specified.\n"
            "    - 'destination': (Optional for 'traffic') The ending point for a traffic query if a route is specified.\n"
            "    *Example 'map' queries and expected JSON:*\n"
            "    - 'Find a hospital in Delhi': `{'intent': 'map', 'location': 'Delhi', 'place_type': 'hospital'}`\n"
            "    - 'Where is the nearest coffee shop?': `{'intent': 'map', 'location': 'Kolkata', 'place_type': 'coffee shop'}`\n"
            "    - 'Address of Victoria Memorial': `{'intent': 'map', 'location': 'Kolkata', 'place_type': 'landmark'}`\n"
            "    - 'How's the traffic in New York?': `{'intent': 'map', 'location': 'New York', 'place_type': 'traffic', 'origin': null, 'destination': null}`\n"
            "    - 'Traffic from Baguiati to Sector V': `{'intent': 'map', 'location': 'Baguiati', 'place_type': 'traffic', 'origin': 'Baguiati', 'destination': 'Sector V'}`\n\n"
            "2.  **'weather' Intent:** For queries about current atmospheric conditions.\n"
            "    **Capabilities (Implemented via OpenWeatherMap Current Weather):**\n"
            "    - Current temperature ('how hot', 'what's the temp').\n"
            "    - 'Feels like' temperature.\n"
            "    - General weather description ('sunny', 'cloudy', 'rainy', 'what's the weather like', 'climate').\n"
            "    - Humidity, Wind speed, Cloudiness percentage, Atmospheric pressure.\n"
            "    **Parameters to extract for 'weather':**\n"
            "    - 'location': The city or area for which weather is requested. (REQUIRED)\n"
            "    *Example 'weather' queries and expected JSON:*\n"
            "    - 'What's the weather in London?': `{'intent': 'weather', 'location': 'London'}`\n\n"
            "3.  **'chat' Intent:** For all other general knowledge questions, greetings, casual conversation, or any queries that cannot be explicitly answered by the 'map' or 'weather' capabilities listed above (e.g., 'directions' without traffic implications, 'chance of rain', 'forecasts', 'historical weather').\n"
            "    *Example 'chat' queries:*\n"
            "    - 'Who is the Prime Minister of India?': `{'intent': 'chat'}`\n"
            "    - 'Will it rain tomorrow in Paris?': `{'intent': 'chat'}`\n\n"
            "**User Query:** '{user_query}'\n"
            f"{history_str}\n\n"
            "Respond ONLY with a valid JSON object in this format:\n"
            '{"intent": "map_or_weather_or_chat", "location": "LOCATION_IF_APPLICABLE", "place_type": "TYPE_FOR_MAPS_ONLY_IF_APPLICABLE", "origin": "ORIGIN_IF_TRAFFIC_ROUTE", "destination": "DESTINATION_IF_TRAFFIC_ROUTE"}\n'
            "Ensure parameters are included only if applicable to the determined intent. "
            "If a location, origin, or destination is not explicitly given and cannot be inferred, set it to null."
        )
        
        try:
            response = self.model_flash.generate_content(prompt)
            text = response.text.strip()
            print("Gemini raw response (extract_parameters_and_intent):", text)

            match = re.search(r"```json\s*(\{.*\})\s*```", text, re.DOTALL)
            if match:
                json_string = match.group(1).strip()
            else:
                match = re.search(r'\{.*\}', text, re.DOTALL)
                if match:
                    json_string = match.group(0).strip()
                else:
                    print("No valid JSON object found in Gemini response for parameter extraction. Defaulting to chat.")
                    return {"intent": "chat"}

            parsed_json = json.loads(json_string)
            
            # Clean up parameters based on intent for strictness
            if parsed_json.get("intent") == "chat":
                parsed_json.pop("location", None)
                parsed_json.pop("place_type", None)
                parsed_json.pop("origin", None)
                parsed_json.pop("destination", None)
            elif parsed_json.get("intent") == "weather":
                parsed_json.pop("place_type", None) 
                parsed_json.pop("origin", None)
                parsed_json.pop("destination", None)
            elif parsed_json.get("intent") == "map":
                # For non-traffic map queries, origin/destination are not relevant
                if parsed_json.get("place_type") != "traffic":
                    parsed_json.pop("origin", None)
                    parsed_json.pop("destination", None)
                # Ensure location is set if origin/destination are but location isn't
                if parsed_json.get("place_type") == "traffic" and not parsed_json.get("location"):
                    if parsed_json.get("origin"):
                        parsed_json["location"] = parsed_json["origin"]
                    elif parsed_json.get("destination"):
                        parsed_json["location"] = parsed_json["destination"]

            return parsed_json
        except json.JSONDecodeError as e:
            print(f"Error parsing Gemini response in extract_parameters_and_intent: {e}")
            print(f"Attempted to parse: {json_string}")
            return {"intent": "chat"}
        except Exception as e:
            print(f"An unexpected error occurred in extract_parameters_and_intent: {e}")
            return {"intent": "chat"}

    def get_live_traffic_data(self, location, origin, destination, maps_api_key):
        """
        Conceptual function to fetch real-time traffic data using Google Directions API.
        In a real scenario, this would make an API call.
        For this example, it returns dummy data or an error if API key is missing.
        """
        if not maps_api_key or maps_api_key == "YOUR_MAPS_API_KEY":  # Check for placeholder key
            return None, "Maps API key is not configured for live traffic data. Please replace 'YOUR_MAPS_API_KEY' with a valid key that has Directions API enabled."

        # --- Real API Call Simulation ---
        # Replace this with actual Directions API call if you have the key and need real data.
        # url = "https://maps.googleapis.com/maps/api/directions/json"
        # now = int(datetime.datetime.now().timestamp())
        # params = {
        #     "origin": origin if origin else location, # Use origin if provided, otherwise general location
        #     "destination": destination if destination else location, # Use destination if provided, otherwise general location
        #     "key": maps_api_key,
        #     "departure_time": now,
        #     "traffic_model": "best_guess"
        # }
        # try:
        #     response = requests.get(url, params=params)
        #     response.raise_for_status() # Raise an HTTPError for bad responses (4xx or 5xx)
        #     data = response.json()
        #     # Parse data similar to the example in previous explanations
        #     if data.get("status") == "OK":
        #         leg = data['routes'][0]['legs'][0]
        #         if 'duration_in_traffic' in leg:
        #             duration_text = leg['duration_in_traffic']['text']
        #             return {"duration_text": duration_text}, None
        #         else:
        #             return None, "Traffic information not available for this route."
        #     else:
        #         return None, f"Directions API returned status: {data.get('status')}. Message: {data.get('error_message', 'No specific error message.')}"
        # except requests.exceptions.RequestException as e:
        #     return None, f"Network or API request error: {e}"
        # except json.JSONDecodeError as e:
        #     return None, f"Error parsing Directions API response JSON: {e}"
        # except (IndexError, KeyError):
        #     return None, "Could not parse traffic data from API response. Is the route valid?"

        # --- Dummy Data for Demonstration (Remove when actual API call is active) ---
        if origin and destination:
            return {"duration_text": "approximately 25-35 minutes with current traffic"}, None
        elif location:
            return {"condition": f"moderate congestion, especially during peak hours around {location}"}, None
        else:
            return None, "Could not determine traffic for the specified location or route."

    def search_places(self, location, place_type, maps_api_key):
        """
        Use the Google Places API (Text Search) to search for places.
        Returns (data, error_message).
        """
        query_string = ""
        if place_type and location:
            query_string = f"{place_type} in {location}"
        elif place_type:
            query_string = f"{place_type} in Kolkata"  # Default to Kolkata if only type
        elif location:
            query_string = f"places in {location}"  # General search in location
        else:
            return None, "A location or place type is required for map search."

        url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
        params = {
            "query": query_string,
            "key": maps_api_key
        }
        response = requests.get(url, params=params)

        if response.status_code != 200:
            return None, f"HTTP Error {response.status_code} from Places API: {response.text}"

        try:
            data = response.json()
            if data.get("status") not in ["OK", "ZERO_RESULTS"]:
                return None, f"Places API returned status: {data.get('status')}. Message: {data.get('error_message', 'No specific error message.')}"
            return data, None
        except json.JSONDecodeError as e:
            return None, f"Error parsing Places API response JSON: {e}. Raw response: {response.text}"

    def get_current_weather(self, location, openweather_api_key):
        """
        Fetches current weather information for a given location using OpenWeatherMap API.
        Returns (weather_data, city_name, error_message).
        """
        geo_url = "http://api.openweathermap.org/geo/1.0/direct"
        geo_params = {
            "q": location,
            "limit": 1,
            "appid": openweather_api_key
        }
        geo_response = requests.get(geo_url, params=geo_params)
        if geo_response.status_code != 200:
            return None, None, f"HTTP Error {geo_response.status_code} from Geocoding API: {geo_response.text}"

        try:
            geo_data = geo_response.json()
            if not geo_data:
                return None, None, f"Could not find coordinates for {location}. Please check the spelling or try a more specific location."
            
            lat = geo_data[0]['lat']
            lon = geo_data[0]['lon']
            city_name = geo_data[0].get('name', location)
        except (json.JSONDecodeError, IndexError, KeyError) as e:
            return None, None, f"Error parsing geocoding response: {e}. Raw response: {geo_response.text}"

        weather_url = "https://api.openweathermap.org/data/2.5/weather"
        weather_params = {
            "lat": lat,
            "lon": lon,
            "appid": openweather_api_key,
            "units": "metric"
        }
        weather_response = requests.get(weather_url, params=weather_params)

        if weather_response.status_code != 200:
            return None, None, f"HTTP Error {weather_response.status_code} from Weather API: {weather_response.text}"

        try:
            weather_data = weather_response.json()
            if weather_data.get("cod") not in [200, "200"]:
                return None, None, f"OpenWeatherMap API error: {weather_data.get('message', 'Unknown error')}"
            return weather_data, city_name, None
        except json.JSONDecodeError as e:
            return None, None, f"Error parsing Weather API response JSON: {e}. Raw response: {weather_response.text}"

    def format_map_results_with_gemini(self, user_query, map_data, history, local_info):
        """
        Uses Gemini to summarize map search results into a natural language response,
        considering previous conversation and prioritizing local info.
        """
        if not map_data or not map_data.get("results"):
            return "I couldn't find any information for your map query at the moment."

        places_info = []
        for i, place in enumerate(map_data["results"][:5]):
            name = place.get('name', 'Unknown Place')
            address = place.get('formatted_address', 'No address available')
            rating_info = f" (Rating: {place['rating']})" if 'rating' in place else ""
            places_info.append(f"{i+1}. {name}, located at {address}{rating_info}.")

        local_info_context = ""
        if local_info:
            local_info_context = (
                f"\n\n**My Internal Knowledge Base:**\n{local_info}\n\n"
                "**PRIORITY RULE:** If the user's query can be answered DIRECTLY and ACCURATELY from 'My Internal Knowledge Base', prioritize that information. "
                "Integrate it smoothly as factual information I possess. "
                "Only if it's not relevant or insufficient, then combine with the map results or use general knowledge. "
                "Do NOT say 'you mentioned' or imply the user provided this local info. State it as a fact from my knowledge."
            )

        prompt_for_summarization = (
            f"{self.get_current_context_string()}\n\n"
            f"The user asked: '{user_query}'\n\n"
            f"I found the following places:\n{'- '.join(places_info)}\n\n"
            f"{local_info_context}"  # Inject local info context
            "Based on the provided conversation history (if any), the user's query, and the found places, "
            "please summarize these findings in a friendly, conversational way, "
            "mentioning the top few relevant places and their addresses. "
            "If the search results seem irrelevant to the original query, acknowledge that "
            "and suggest trying a different query or that you are better at finding specific "
            "types of establishments. "
            "Do not explicitly mention 'API results' or 'extracted data'. "
            "Just provide a helpful answer as if you found them naturally."
        )
        
        try:
            chat_session = self.model_pro.start_chat(history=history)
            response = chat_session.send_message(prompt_for_summarization)
            return response.text
        except Exception as e:
            print(f"Error generating Gemini response for map formatting: {e}")
            return "I found some places, but I'm having trouble summarizing them right now."

    def format_weather_data_with_gemini(self, user_query, weather_data, city_name, history, local_info):
        """
        Uses Gemini to summarize weather data into a natural language response,
        considering previous conversation and prioritizing local info.
        """
        if not weather_data:
            return "I couldn't retrieve complete weather information for that location."

        try:
            main = weather_data['main']
            weather_desc = weather_data['weather'][0]['description']
            temp = main['temp']
            feels_like = main['feels_like']
            humidity = main['humidity']
            wind_speed = weather_data['wind']['speed']
            pressure = main.get('pressure', 'N/A')
            clouds = weather_data['clouds'].get('all', 'N/A')

            weather_summary_raw = (
                f"Current temperature is {temp}°C (feels like {feels_like}°C) in {city_name}. "
                f"The sky is {weather_desc}. "
                f"Humidity is {humidity}%. Wind speed is {wind_speed} meters/second. "
                f"Cloudiness is {clouds}%. Atmospheric pressure is {pressure} hPa."
            )
        except KeyError as e:
            print(f"Missing key in weather data for Gemini formatting: {e}")
            weather_summary_raw = "I have some weather data, but it's incomplete."

        local_info_context = ""
        if local_info:
            local_info_context = (
                f"\n\n**My Internal Knowledge Base:**\n{local_info}\n\n"
                "**PRIORITY RULE:** If the user's query can be answered DIRECTLY and ACCURATELY from 'My Internal Knowledge Base', prioritize that information. "
                "Integrate it smoothly as factual information I possess. "
                "Only if it's not relevant or insufficient, then combine with the weather results or use general knowledge. "
                "Do NOT say 'you mentioned' or imply the user provided this local info. State it as a fact from my knowledge."
            )

        prompt_for_summarization = (
            f"{self.get_current_context_string()}\n\n"
            f"The user asked: '{user_query}'\n\n"
            f"Here is the current weather data: {weather_summary_raw}\n\n"
            f"{local_info_context}"  # Inject local info context
            "Based on the provided conversation history (if any) and the above weather data, "
            "please provide this weather information in a friendly, conversational way. "
            "Focus only on the current conditions and information that was provided. "
            "Do not explicitly mention 'API results' or 'extracted data'. "
            "Just provide a helpful answer."
        )
        try:
            chat_session = self.model_pro.start_chat(history=history)
            response = chat_session.send_message(prompt_for_summarization)
            return response.text
        except Exception as e:
            print(f"Error generating Gemini response for weather formatting: {e}")
            return "I retrieved the weather data, but I'm having trouble summarizing it right now."

    def format_traffic_results_with_gemini(self, user_query, traffic_data, location, origin, destination, history, local_info):
        """
        Uses Gemini to summarize traffic data into a natural language response,
        considering previous conversation and prioritizing local info.
        """
        traffic_summary_raw = ""
        if traffic_data and "duration_text" in traffic_data:
            traffic_summary_raw = f"The estimated travel time with current traffic from {origin or location} to {destination or location} is {traffic_data['duration_text']}."
        elif traffic_data and "condition" in traffic_data:
            traffic_summary_raw = f"Currently, there is {traffic_data['condition']} traffic in {location}."
        else:
            traffic_summary_raw = "I couldn't retrieve specific live traffic information at this moment."

        local_info_context = ""
        if local_info:
            local_info_context = (
                f"\n\n**My Internal Knowledge Base:**\n{local_info}\n\n"
                "**PRIORITY RULE:** If the user's query can be answered DIRECTLY and ACCURATELY from 'My Internal Knowledge Base', prioritize that information. "
                "Integrate it smoothly as factual information I possess. "
                "Only if it's not relevant or insufficient, then combine with the traffic results or use general knowledge. "
                "Do NOT say 'you mentioned' or imply the user provided this local info. State it as a fact from my knowledge."
            )

        prompt_for_summarization = (
            f"{self.get_current_context_string()}\n\n"
            f"The user asked: '{user_query}'\n\n"
            f"Here is the traffic information: {traffic_summary_raw}\n\n"
            f"{local_info_context}"  # Inject local info context
            "Based on the provided conversation history (if any), the user's query, and the traffic data, "
            "please provide this traffic information in a friendly, conversational way. "
            "Focus only on the current conditions and information that was provided. "
            "If specific traffic data could not be retrieved, gracefully state that. "
            "Do not explicitly mention 'API results' or 'extracted data'. "
            "Just provide a helpful answer."
        )
        try:
            chat_session = self.model_pro.start_chat(history=history)
            response = chat_session.send_message(prompt_for_summarization)
            return response.text
        except Exception as e:
            print(f"Error generating Gemini response for traffic formatting: {e}")
            return "I retrieved some traffic data, but I'm having trouble summarizing it right now."

    def general_chat_with_gemini(self, user_query, history, local_info):
        """
        Handles general chat queries using Gemini, considering previous conversation
        and prioritizing local information.
        """
        full_chat_prompt = f"{self.get_current_context_string()}\n\n"
        
        local_info_context = ""
        if local_info:
            local_info_context = (
                f"\n\n**My Internal Knowledge Base:**\n{local_info}\n\n"
                "**PRIORITY RULE:** If the user's query can be answered DIRECTLY and ACCURATELY from 'My Internal Knowledge Base', prioritize that information. "
                "Integrate it smoothly as factual information I possess. "
                "Only if it's not relevant or insufficient, then use your general knowledge. "
                "Do NOT say 'you mentioned' or imply the user provided this local info. State it as a fact from my knowledge."
                "Avoid repeating the local info if it does not directly pertain to the current query."
            )

        for item in history:
            full_chat_prompt += f"{item['role'].capitalize()}: {item['parts'][0]['text']}\n"
        
        full_chat_prompt += f"User: {user_query}\n\n"
        full_chat_prompt += f"{local_info_context}"  # Inject local info context for general chat
        full_chat_prompt += "Please provide a helpful and conversational response."

        try:
            chat_session = self.model_pro.start_chat(history=history)  # Use start_chat for full history context
            response = chat_session.send_message(full_chat_prompt)
            return response.text
        except Exception as e:
            print(f"Error generating Gemini response for general chat: {e}")
            return "I'm sorry, I encountered an issue while trying to answer that question."

    def conversation(self, question_asked, user_lat, user_long, chat_history=None):
        """
        Enhanced conversation method that accepts existing chat history
        
        Args:
            question_asked (str): User's question
            user_lat (float): User's latitude
            user_long (float): User's longitude  
            chat_history (list, optional): Existing conversation history
        
        Returns:
            str: Bot response message
        """
        print("Welcome to your AI Assistant! I can help with maps, weather, and general questions.")
        print(f"I will remember the last {self.MAX_HISTORY_LENGTH} turns of our conversation only within this session.")
        
        global curr_lat
        global curr_long
        curr_lat = user_lat
        curr_long = user_long

        # Use provided chat history or initialize empty list
        if chat_history is not None:
            self.conversation_history = chat_history.copy()
            print(f"Loaded existing conversation history with {len(self.conversation_history)} messages")
        else:
            # Only clear history if no history is provided and user says 'exit'
            if question_asked.lower() == 'exit':
                self.conversation_history = [] 
                print("Memory cleared. Exiting chat. Goodbye!")
                return "Goodbye! Your conversation history has been cleared."

        # Load local information
        self.load_local_information(question_asked)
        
        # Note: Don't add to history here since FastAPI handles this
        # self.add_to_history("user", question_asked)

        # Extract parameters and intent
        params = self.extract_parameters_and_intent(question_asked, self.conversation_history)
        intent = params.get("intent", "chat")
        location = params.get("location")
        place_type = params.get("place_type") 
        origin = params.get("origin")
        destination = params.get("destination")

        print(f"\nDetected Intent: {intent}")
        if location: print(f"  Location: {location}")
        if place_type: print(f"  Place Type/Sub-Intent: {place_type}")
        if origin: print(f"  Origin: {origin}")
        if destination: print(f"  Destination: {destination}")

        response_message = ""

        if intent == "map":
            if place_type == "traffic":
                print(f"Attempting to fetch traffic data for {location} (Origin: {origin}, Destination: {destination})...")
                # Call the new traffic function
                traffic_data, error = self.get_live_traffic_data(location, origin, destination, self.MAPS_API_KEY)
                
                if error:
                    print(f"Error during traffic data fetch: {error}")
                    response_message = f"Sorry, I couldn't get live traffic updates for {location}. {error}"
                elif traffic_data:
                    response_message = self.format_traffic_results_with_gemini(question_asked, traffic_data, location, origin, destination, self.conversation_history, self.local_information_string)
                else:
                    response_message = f"I couldn't retrieve specific traffic information for {location} at this time."

            elif not location:
                response_message = "I need a location to search for places. Could you please specify one?"
            elif not place_type:
                response_message = f"Please specify what kind of place you are looking for in {location}, or a more specific map query."
            else:
                print(f"Searching for {place_type} in {location} using Google Maps...")
                map_results, error = self.search_places(location, place_type, self.MAPS_API_KEY)

                if error:
                    print(f"Error during map search: {error}")
                    response_message = "Sorry, I encountered an issue while trying to get map information. Please try again later."
                elif map_results and "results" in map_results and map_results["results"]:
                    response_message = self.format_map_results_with_gemini(question_asked, map_results, self.conversation_history, self.local_information_string)
                else:
                    response_message = f"Sorry, I couldn't find any {place_type} in {location}. Perhaps try a different type of place or location?"
        
        elif intent == "weather":
            if not location:
                response_message = "I need a location to fetch weather information. Could you please specify one?"
            else:
                print(f"Fetching weather for {location} using OpenWeatherMap...")
                weather_data, city_name, error = self.get_current_weather(location, self.OPENWEATHER_API_KEY)

                if error:
                    print(f"Error during weather fetch: {error}")
                    response_message = "Sorry, I couldn't retrieve weather information for that location right now. Please check the spelling or try again later."
                elif weather_data:
                    response_message = self.format_weather_data_with_gemini(question_asked, weather_data, city_name, self.conversation_history, self.local_information_string)
                else:
                    response_message = f"Sorry, I couldn't retrieve weather information for {location}."

        else: # General chat
            print("Processing general query...")
            response_message = self.general_chat_with_gemini(question_asked, self.conversation_history, self.local_information_string)
        
        print("\n" + response_message)
        print("\n" + self.local_information_string)
        
        # Note: Don't add to history here since FastAPI handles this
        # self.add_to_history("model", response_message)
        
        return response_message
            
            

# if __name__ == "__main__":
#     ChatbotLocal().conversation("weather here",user_lat =27.173891, user_long=78.042068)