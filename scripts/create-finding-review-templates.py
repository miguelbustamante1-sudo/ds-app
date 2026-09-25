#!/usr/bin/env python3
"""
Creates and publishes the two Findings Review Workflow templates through the
workflow admin API — the same endpoints /admin/workflow/templates uses — so the
app's own validation and publish checks run (DATABASE execution type, CONTEXT
assignment, proc names present in pg_proc). Local development only: it logs in
with the dev-login credentials from .env.local.

Idempotent: a template code that already has a PUBLISHED version is skipped.

No longer needed for a normal setup (2026-09-25): scripts/seed.sql (local) and the
production bundle insert the same templates from prisma/scripts/findings_review_templates.sql,
which was generated from the rows this script created. Kept to re-validate template
changes through the admin API before regenerating that file.

Usage (app running on http://localhost:3000):
    python3 scripts/create-finding-review-templates.py
"""
import http.cookiejar
import json
import pathlib
import sys
import urllib.request

BASE = "http://localhost:3000/api"
PROC_START = "sp_start_finding_review_workflow"   # bare names: publish checks pg_proc.proname
PROC_OUTCOME = "sp_handle_finding_outcome"


def outcome(code, label, terminal, description):
    return {
        "code": code, "label": label, "description": description, "isTerminal": terminal,
        "triggersOutcomeAction": True, "executionType": "DATABASE", "outcomeProcName": PROC_OUTCOME,
    }


def task(code, name, description, sequence, starting, outcomes):
    return {
        "body": {
            "code": code, "name": name, "description": description, "sequenceNo": sequence,
            "taskType": "MANUAL", "assignmentType": "CONTEXT", "priority": "MEDIUM",
            "isStartingTask": starting,
        },
        "outcomes": outcomes,
    }


TEMPLATES = [
    {
        "body": {
            "code": "FINDING_CHANGE_REVIEW", "name": "Finding Review — Change", "versionNo": 1,
            "description": "Review a watched field that drifted from its approved baseline.",
            "executionType": "DATABASE", "instantiateProcName": PROC_START,
        },
        "tasks": [
            task("REVIEW_CHANGE", "Review Change",
                 "A watched field changed from its approved baseline. Agree to accept the new value as the "
                 "baseline, or Disagree to keep the baseline and wait for the source system to be corrected.",
                 1, True, [
                     outcome("AGREE", "Agree", True, "Accept the new value; the approved baseline advances."),
                     outcome("DISAGREE", "Disagree", False,
                             "Keep the baseline; the finding stays tracked until a snapshot shows it fixed."),
                 ]),
            task("AWAIT_CHANGE_FIX", "Awaiting Fix",
                 "You disagreed with this change. Closes automatically once a snapshot shows the approved "
                 "value again. Agree if you change your mind and accept the new value.",
                 2, False, [
                     outcome("AGREE", "Agree (accept new value)", True,
                             "Accept the new value after all; the approved baseline advances."),
                 ]),
        ],
    },
    {
        "body": {
            "code": "FINDING_RULE_REVIEW", "name": "Finding Review — Rule", "versionNo": 1,
            "description": "Review a value that violates a state detection rule.",
            "executionType": "DATABASE", "instantiateProcName": PROC_START,
        },
        "tasks": [
            task("REVIEW_RULE_FLAG", "Review Rule Flag",
                 "A value violates a detection rule. Fix it in the source system, then Mark as Resolved; "
                 "the flag closes once a snapshot confirms the fix.",
                 1, True, [
                     outcome("MARK_RESOLVED", "Mark as Resolved", False,
                             "The source is being fixed; wait for a snapshot to confirm it."),
                 ]),
            task("AWAIT_RULE_FIX", "Awaiting Confirmation",
                 "Marked as resolved. Closes automatically once a snapshot shows the rule passing. "
                 "Dismiss to close the flag without a fix.",
                 2, False, [
                     outcome("DISMISS", "Dismiss", True, "Close the flag without waiting for a fix."),
                 ]),
        ],
    },
]


def env_value(key):
    for line in pathlib.Path(".env.local").read_text().splitlines():
        if line.startswith(f"{key}="):
            return line.split("=", 1)[1].split("#", 1)[0].strip().strip('"')
    sys.exit(f"{key} missing from .env.local")


opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))


def call(method, path, body=None):
    req = urllib.request.Request(
        BASE + path, method=method, headers={"Content-Type": "application/json"},
        data=json.dumps(body).encode() if body is not None else None,
    )
    try:
        with opener.open(req) as res:
            text = res.read().decode()
            return json.loads(text).get("data") if text else None
    except urllib.error.HTTPError as err:
        sys.exit(f"{method} {path} -> {err.code}: {err.read().decode()}")


call("POST", "/auth/dev-login", {"email": env_value("DEV_USERNAME"), "password": env_value("DEV_USER_PASSWORD")})
existing = call("GET", "/workflow/templates") or []
existing = existing.get("items", existing) if isinstance(existing, dict) else existing

for tpl in TEMPLATES:
    code = tpl["body"]["code"]
    if any(t.get("code") == code and t.get("status") == "PUBLISHED" for t in existing):
        print(f"{code}: already PUBLISHED, skipped")
        continue

    wfl_id = call("POST", "/workflow/templates", tpl["body"])["wflId"]
    for t in tpl["tasks"]:
        wtk_id = call("POST", f"/workflow/templates/{wfl_id}/tasks", t["body"])["wtkId"]
        for o in t["outcomes"]:
            call("POST", f"/workflow/templates/{wfl_id}/tasks/{wtk_id}/outcomes", o)
    call("POST", f"/workflow/templates/{wfl_id}/publish")
    print(f"{code}: created and PUBLISHED ({wfl_id})")
