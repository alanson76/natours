// console.log('hello from client side');


export const displayMap = (locations) => {
    mapboxgl.accessToken = 'pk.eyJ1IjoiYWxhbnNvbjc2IiwiYSI6ImNrMTBkajNlYTAwOXczZ295YXM4aG55a2cifQ.G5cIYZuApNKi4kohj3YOYA';

    var map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/alanson76/ck10dneat0v491ct1h8s3xdzl',
        scrollZoom: false

        // center: [34.111745, -118.113491],
        // zoom: 4,
        // interactive: false
    });

    const bounds = new mapboxgl.LngLatBounds();

    locations.forEach(loc => {
        //create marker
        const el = document.createElement('div');
        el.className = 'marker';

        //add marker
        new mapboxgl.Marker({
            element: el,
            anchor: 'bottom'
        }).setLngLat(loc.coordinates).addTo(map);

        //add popup
        new mapboxgl.Popup({
                offset: 30
            })
            .setLngLat(loc.coordinates)
            .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
            .addTo(map)

        //extends map bounds to include current location
        bounds.extend(loc.coordinates);
    });

    map.fitBounds(bounds, {
        padding: {
            top: 200,
            bottom: 150,
            left: 200,
            right: 100
        }
    });
}

