const GOOGLE_MAPS_API_KEY = 'your_google_maps_api_key_here';

let map;
let directionsService;
let autocompleteStart;
let autocompleteEnd;

function initGoogleMaps() {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=initializeServices`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
}

function initializeServices() {
    try {
        directionsService = new google.maps.DirectionsService();
        
        const startInput = document.getElementById('startPoint');
        const endInput = document.getElementById('endPoint');
        
        autocompleteStart = new google.maps.places.Autocomplete(startInput, {
            componentRestrictions: { country: 'us' },
            fields: ['formatted_address', 'geometry'],
            bounds: new google.maps.LatLngBounds(
                new google.maps.LatLng(47.5, -122.4),
                new google.maps.LatLng(47.7, -122.2)
            )
        });
        
        autocompleteEnd = new google.maps.places.Autocomplete(endInput, {
            componentRestrictions: { country: 'us' },
            fields: ['formatted_address', 'geometry'],
            bounds: new google.maps.LatLngBounds(
                new google.maps.LatLng(47.5, -122.4),
                new google.maps.LatLng(47.7, -122.2)
            )
        });
        
        console.log('Google Maps services initialized successfully');
    } catch (error) {
        console.error('Error initializing Google Maps services:', error);
    }
}

async function handleStartPoint() {
    const startPoint = document.getElementById('startPoint').value;
    if (startPoint) {
        document.getElementById('endPointBubble').style.display = 'flex';
    }
}

async function handleEndPoint() {
    const startPoint = document.getElementById('startPoint').value;
    const endPoint = document.getElementById('endPoint').value;
    
    if (!startPoint || !endPoint) {
        alert('请输入起点和终点');
        return;
    }
    
    if (!directionsService) {
        console.error('Direction service not initialized');
        alert('服务未准备就绪，请稍后再试');
        return;
    }

    try {
        console.log('========== 开始计算路线 ==========');
        console.log('起点:', startPoint);
        console.log('终点:', endPoint);

        await calculateRoute(startPoint, endPoint, 'BICYCLING', {
            costRate: 1.5,
            bubbleId: 'bikingBubble',
            costClass: 'bike-cost',
            timeClass: 'bike-time',
            distanceClass: 'bike-distance',
            locationClass: 'bike-location',
            mapClass: 'bike-map'
        });

        await calculateRoute(startPoint, endPoint, 'TRANSIT', {
            costRate: 2.75,
            bubbleId: 'transitBubble',
            costClass: 'transit-cost',
            timeClass: 'transit-time',
            distanceClass: 'transit-distance',
            locationClass: 'transit-location',
            mapClass: 'transit-map',
            transitOptions: {
                modes: ['BUS', 'RAIL'],
                routingPreference: 'FEWER_TRANSFERS'
            }
        });

        await calculateRoute(startPoint, endPoint, 'DRIVING', {
            bubbleId: 'drivingBubble',
            costClass: 'driving-cost',
            timeClass: 'driving-time',
            distanceClass: 'driving-distance',
            locationClass: 'driving-location',
            mapClass: 'driving-map'
        });

    } catch (error) {
        console.error('Error calculating routes:', error);
        alert('计算路线时出错：' + error.message);
    }
}

async function calculateRoute(startPoint, endPoint, mode, options) {
    try {
        console.log(`\n---------- ${mode} 路线计算 ----------`);
        
        const request = {
            origin: startPoint,
            destination: endPoint,
            travelMode: google.maps.TravelMode[mode],
            region: 'us'
        };

        if (options.transitOptions) {
            request.transitOptions = options.transitOptions;
        }
        
        const response = await directionsService.route(request);
        const route = response.routes[0];
        const leg = route.legs[0];
        
        console.log('总距离:', leg.distance.text);
        console.log('预计时间:', leg.duration.text);
        console.log('起点坐标:', leg.start_location.lat(), leg.start_location.lng());
        console.log('终点坐标:', leg.end_location.lat(), leg.end_location.lng());
        
        const distanceInMiles = leg.distance.value / 1609.34;
        let estimatedCost;
        let accessibilityText;
        
        if (mode === 'TRANSIT') {
            estimatedCost = options.costRate;
            console.log('公交票价（固定）:', estimatedCost);
            
            let totalWalkingDistance = 0;
            leg.steps.forEach(step => {
                if (step.travel_mode === 'WALKING') {
                    totalWalkingDistance += step.distance.value;
                    console.log('步行段距离:', (step.distance.value / 1609.34).toFixed(2), '英里');
                }
            });
            const walkingMiles = Math.round(totalWalkingDistance / 1609.34 * 10) / 10;
            accessibilityText = `${walkingMiles}mi walk`;
            console.log('总步行距离:', walkingMiles, '英里');
            
        } else if (mode === 'DRIVING') {
            estimatedCost = Math.round(options.baseFare + (distanceInMiles * options.costRate));
            console.log('Uber基本起步价:', options.baseFare);
            console.log('距离费用:', Math.round(distanceInMiles * options.costRate));
            console.log('总费用:', estimatedCost);
            accessibilityText = '0mi walk';
            
        } else {
            estimatedCost = Math.round(distanceInMiles * options.costRate);
            console.log('距离（英里）:', distanceInMiles.toFixed(2));
            console.log('费率（每英里）:', options.costRate);
            console.log('总费用:', estimatedCost);
            accessibilityText = `${Math.round(distanceInMiles * 10) / 10}mi ride`;
        }
        
        const timeInMinutes = Math.round(leg.duration.value / 60);
        console.log('行程时间（分钟）:', timeInMinutes);
        
        console.log('\n路线步骤:');
        leg.steps.forEach((step, index) => {
            console.log(`${index + 1}. ${step.travel_mode}: ${step.distance.text}, ${step.duration.text}`);
        });
        
        updateRouteMetricsById(estimatedCost, timeInMinutes, accessibilityText, options);
        
        document.getElementById(options.bubbleId).style.display = 'flex';
        
        document.querySelector(`.${options.locationClass}`).textContent = leg.end_address.split(',')[0];
        
        generateStaticMap(leg, route, mode, options.mapClass);
        
    } catch (error) {
        console.error(`Error calculating ${mode} route:`, error);
        throw error;
    }
}

function generateStaticMap(leg, route, mode, mapClass) {
    try {
        const path = route.overview_path.map(point => `${point.lat()},${point.lng()}`).join('|');
        
        const bounds = new google.maps.LatLngBounds();
        
        bounds.extend(leg.start_location);
        bounds.extend(leg.end_location);
        
        route.overview_path.forEach(point => {
            bounds.extend(point);
        });
        
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        
        const latSpan = ne.lat() - sw.lat();
        const lngSpan = ne.lng() - sw.lng();
        
        const newSw = new google.maps.LatLng(sw.lat() - latSpan * 0.2, sw.lng() - lngSpan * 0.2);
        const newNe = new google.maps.LatLng(ne.lat() + latSpan * 0.2, ne.lng() + lngSpan * 0.2);
        
        console.log('地图边界:', 
            `西南角: ${newSw.lat()},${newSw.lng()}`, 
            `东北角: ${newNe.lat()},${newNe.lng()}`
        );
        
        let pathColor;
        switch (mode) {
            case 'BICYCLING':
                pathColor = '0x4CAF50';
                break;
            case 'TRANSIT':
                pathColor = '0x2196F3';
                break;
            case 'DRIVING':
                pathColor = '0xF44336';
                break;
            default:
                pathColor = '0x9C27B0';
        }
        
        const mapParams = {
            size: '400x200',
            scale: '2', 
            maptype: 'roadmap',
            language: 'en',
            markers: `color:green|label:A|${leg.start_location.lat()},${leg.start_location.lng()}|` +
                     `color:red|label:B|${leg.end_location.lat()},${leg.end_location.lng()}`,
            path: `color:${pathColor}|weight:5|${path}`,
            key: GOOGLE_MAPS_API_KEY,
            style: 'feature:poi|visibility:off',
            visible: `${newSw.lat()},${newSw.lng()}|${newNe.lat()},${newNe.lng()}`
        };
        
        // 构建静态地图 URL
        let staticMapUrl = 'https://maps.googleapis.com/maps/api/staticmap?';
        for (const [key, value] of Object.entries(mapParams)) {
            staticMapUrl += `${key}=${encodeURIComponent(value)}&`;
        }
        
        console.log('静态地图 URL 生成成功');
        console.log('地图 URL:', staticMapUrl);
        
        // 更新地图图像
        const mapElement = document.querySelector(`.${mapClass}`);
        if (mapElement) {
            mapElement.style.backgroundImage = `url('${staticMapUrl}')`;
            mapElement.style.backgroundSize = 'cover';
            mapElement.style.backgroundPosition = 'center';
            
            mapElement.style.display = 'block';
            mapElement.style.height = '200px';
        } else {
            console.error(`未找到地图元素: .${mapClass}`);
        }
    } catch (error) {
        console.error('生成静态地图时出错:', error);
    }
}

function updateRouteMetricsById(cost, time, accessibilityText, options) {
    try {
        document.querySelector(`.${options.costClass}`).textContent = `$ ${cost}`;
        document.querySelector(`.${options.timeClass}`).textContent = `${time} min`;
        document.querySelector(`.${options.distanceClass}`).textContent = accessibilityText;
    } catch (error) {
        console.error('Error updating metrics:', error);
    }
}

document.addEventListener('DOMContentLoaded', initGoogleMaps); 