import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from fastapi.testclient import TestClient
from app.main import app

def test_api():
    print("Testing CASELINK FastAPI endpoints with TestClient...")
    with TestClient(app) as client:
        # 1. Health
        res = client.get("/api/health")
        print(f"GET /api/health -> {res.status_code}, data: {res.json()}")
        assert res.status_code == 200
        assert res.json()["status"] == "ok"

        # 2. Login as PGRC officer
        login_res = client.post("/api/auth/login", json={"email": "pgrc1@caselink.demo", "password": "Caselink@2026"})
        print(f"POST /api/auth/login (pgrc1) -> {login_res.status_code}")
        assert login_res.status_code == 200
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 3. GET /api/auth/me
        me_res = client.get("/api/auth/me", headers=headers)
        assert me_res.status_code == 200
        print(f"GET /api/auth/me -> {me_res.json()['name']} ({me_res.json()['role']})")

        # 4. GET /api/dashboard/summary
        dash_res = client.get("/api/dashboard/summary", headers=headers)
        assert dash_res.status_code == 200
        dash_data = dash_res.json()
        print(f"GET /api/dashboard/summary -> Total: {dash_data['total_received']}, Open Overlaps: {dash_data['overlap_open_count']}, Overdue: {dash_data['overdue']}")

        # 5. GET /api/institutions
        insts_res = client.get("/api/institutions?page=1&page_size=5", headers=headers)
        assert insts_res.status_code == 200
        inst_list = insts_res.json()["items"]
        print(f"GET /api/institutions -> Total: {insts_res.json()['total']}, sample: {inst_list[0]['name']}")
        sample_inst_id = inst_list[0]["id"]

        # 6. GET /api/institutions/{id} (Institution 360)
        inst_360 = client.get(f"/api/institutions/{sample_inst_id}", headers=headers)
        assert inst_360.status_code == 200
        print(f"GET /api/institutions/{sample_inst_id} (360) -> Bureaus handling: {inst_360.json()['kpis']['handling_bureaus']}")

        # 7. GET /api/cases
        cases_res = client.get("/api/cases?page=1&page_size=5", headers=headers)
        assert cases_res.status_code == 200
        case_items = cases_res.json()["items"]
        print(f"GET /api/cases -> Total: {cases_res.json()['total']}, sample: {case_items[0]['case_no']}")

        # 8. GET /api/overlaps
        overlaps_res = client.get("/api/overlaps", headers=headers)
        assert overlaps_res.status_code == 200
        overlaps = overlaps_res.json()
        print(f"GET /api/overlaps -> Count: {len(overlaps)}")
        assert len(overlaps) > 0, "Planted overlaps should be detected!"

        # 9. GET /api/alerts
        alerts_res = client.get("/api/alerts", headers=headers)
        assert alerts_res.status_code == 200
        print(f"GET /api/alerts -> Count: {len(alerts_res.json())}")

        # 10. GET /api/reports/bureau-wise
        rep_res = client.get("/api/reports/bureau-wise", headers=headers)
        assert rep_res.status_code == 200
        print(f"GET /api/reports/bureau-wise -> {len(rep_res.json())} bureaus analyzed")

        # 11. Test Overlap Review
        first_overlap = overlaps[0]
        review_res = client.post(
            f"/api/overlaps/{first_overlap['id']}/review",
            json={"decision": "CONFIRM", "remark": "Verified coordination link between PGRC and RB cases."},
            headers=headers
        )
        assert review_res.status_code == 200
        print(f"POST /api/overlaps/{first_overlap['id']}/review -> {review_res.json()}")

    print("\nALL BACKEND API ENDPOINTS VERIFIED AND WORKING PERFECTLY!")

if __name__ == "__main__":
    test_api()
