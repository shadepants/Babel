#!/usr/bin/env python3
"""Quick debug script to check registered routes."""
import sys
sys.path.insert(0, '.')

try:
    from server.app import app
    print("✓ App imported successfully")
    print(f"Total routes: {len(app.routes)}")
    print("\nRegistered routes:")
    for route in app.routes:
        if hasattr(route, 'path'):
            print(f"  {route.path:40} {getattr(route, 'name', '?')}")
        elif hasattr(route, 'app'):
            print(f"  [MOUNT] {route.path if hasattr(route, 'path') else '?'}")
except Exception as e:
    print(f"✗ Error: {e}")
    import traceback
    traceback.print_exc()
