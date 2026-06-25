import json
import os
from shapely.geometry import Point, shape
from shapely.geometry.polygon import Polygon
from shapely.geometry.multipolygon import MultiPolygon
from shapely.geometry.linestring import LineString
from shapely.geometry.multilinestring import MultiLineString

class JurisdictionEngine:
    def __init__(self, data_dir="data"):
        self.data_dir = data_dir
        self.chennai_wards = []
        self.national_highways = []
        self.state_highways = []
        self.rural_panchayats = []
        
        # Buffer for lines in degrees (~50 meters)
        self.highway_buffer = 0.00045 
        
        self.load_datasets()

    def _load_geojson(self, filename):
        filepath = os.path.join(self.data_dir, filename)
        if not os.path.exists(filepath):
            print(f"Warning: {filename} not found in {self.data_dir}")
            return []
            
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
            features = []
            for feature in data.get('features', []):
                try:
                    geom = shape(feature['geometry'])
                    features.append({
                        'geometry': geom,
                        'properties': feature.get('properties', {})
                    })
                except Exception as e:
                    pass
            return features
        except Exception as e:
            print(f"Error loading {filename}: {e}")
            return []

    def load_datasets(self):
        print("Loading GIS datasets...")
        self.chennai_wards = self._load_geojson("chennai_wards.geojson")
        self.national_highways = self._load_geojson("national_highways.geojson")
        self.state_highways = self._load_geojson("state_highways.geojson")
        self.rural_panchayats = self._load_geojson("rural_panchayats.json")
        print(f"Loaded {len(self.chennai_wards)} Chennai wards.")
        print(f"Loaded {len(self.national_highways)} National Highways.")
        print(f"Loaded {len(self.state_highways)} State Highways.")
        print(f"Loaded {len(self.rural_panchayats)} Rural Panchayats.")

    def get_jurisdiction(self, lat, lng):
        try:
            point = Point(float(lng), float(lat))
        except (ValueError, TypeError):
            return {"Authority": "Unknown", "Details": "Invalid coordinates"}

        # 1. Check National Highways (Highest priority)
        for nh in self.national_highways:
            geom = nh['geometry']
            if geom.distance(point) <= self.highway_buffer:
                name = nh['properties'].get('ref', nh['properties'].get('name', 'Unknown NH'))
                return {
                    "Authority": "NHAI (National Highways Authority of India)",
                    "Type": "National Highway",
                    "Details": str(name)
                }

        # 2. Check State Highways
        for sh in self.state_highways:
            geom = sh['geometry']
            if geom.distance(point) <= self.highway_buffer:
                name = sh['properties'].get('ref', sh['properties'].get('name', 'Unknown SH'))
                return {
                    "Authority": "State Highways Department",
                    "Type": "State Highway",
                    "Details": str(name)
                }

        # 3. Check Chennai Wards
        for ward in self.chennai_wards:
            geom = ward['geometry']
            if geom.contains(point):
                props = ward['properties']
                ward_no = props.get('Ward_No', props.get('ward', 'Unknown'))
                zone_no = props.get('Zone_No', props.get('zone', 'Unknown'))
                zone_name = props.get('Zone_Name', props.get('zone_name', 'Unknown'))
                return {
                    "Authority": "Greater Chennai Corporation (GCC)",
                    "Type": "Urban Local Body",
                    "Details": f"Ward {ward_no}, Zone {zone_no} ({zone_name})"
                }

        # 4. Check Rural Panchayats
        for panchayat in self.rural_panchayats:
            geom = panchayat['geometry']
            if geom.contains(point):
                props = panchayat['properties']
                p_name = props.get('name', props.get('panchayat', 'Unknown Panchayat'))
                district = props.get('district', 'Unknown District')
                return {
                    "Authority": "Rural Development and Panchayat Raj Department",
                    "Type": "Village Panchayat",
                    "Details": f"{p_name}, {district}"
                }

        return {
            "Authority": "Unknown Jurisdiction",
            "Type": "Unmapped Area",
            "Details": "Location falls outside known mapped zones"
        }

# Singleton instance
engine = JurisdictionEngine()
