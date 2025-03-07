# Zoho Projects API Connector

## Zoho OAuth 2.0 - Getting Access and Refresh Tokens

## Step 1: Get Authorization Code
Redirect the user to Zoho's authorization URL:

```
https://accounts.zoho.com/oauth/v2/auth
```

### Request Parameters:
| Parameter      | Description |
|--------------|------------|
| `client_id`  | Your Zoho Client ID |
| `response_type` | Set to `code` |
| `redirect_uri` | The URL to which Zoho should redirect after authentication |
| `scope` | The API scopes required (e.g., `ZohoProjects.portals.READ ZohoProjects.projects.READ ZohoProjects.bugs.READ ZohoProjects.tasks.READ ZohoProjects.comments.READ`) |
| `access_type` | Set to `offline` to get a refresh token |
| `prompt` | Set to `consent` (optional, forces user to allow access) |
| `state` | A random string to prevent CSRF attacks (optional) |

### Example URL:
```
https://accounts.zoho.com/oauth/v2/auth?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=YOUR_REDIRECT_URI&scope=ZohoProjects.tasks.ALL&access_type=offline&prompt=consent
```

- The user will be redirected to your **redirect_uri** with an `authorization_code` in the query params.

---

## Step 2: Exchange Authorization Code for Access Token
Once you have the `code`, send a POST request to Zoho's token API.

```
POST https://accounts.zoho.com/oauth/v2/token
```

### Headers:
```
Content-Type: application/x-www-form-urlencoded
```

### Body Parameters:
| Parameter      | Description |
|--------------|------------|
| `client_id`  | Your Zoho Client ID |
| `client_secret` | Your Zoho Client Secret |
| `redirect_uri` | Same redirect URI as used in Step 1 |
| `code` | The authorization code received in Step 1 |
| `grant_type` | Set to `authorization_code` |

### Example Request (cURL):
```sh
curl -X POST "https://accounts.zoho.com/oauth/v2/token" \
     -d "client_id=YOUR_CLIENT_ID" \
     -d "client_secret=YOUR_CLIENT_SECRET" \
     -d "redirect_uri=YOUR_REDIRECT_URI" \
     -d "code=AUTHORIZATION_CODE" \
     -d "grant_type=authorization_code"
```

### Response:
```json
{
  "access_token": "1000.xxxxxxxx",
  "refresh_token": "1000.yyyyyyyy",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```
- `access_token` is valid for **1 hour**.
- `refresh_token` is **permanent** and used to get new access tokens.

---

## Step 3: Refresh Access Token
When the `access_token` expires, use the `refresh_token` to get a new one.

```
POST https://accounts.zoho.com/oauth/v2/token
```

### Body Parameters:
| Parameter      | Description |
|--------------|------------|
| `client_id`  | Your Zoho Client ID |
| `client_secret` | Your Zoho Client Secret |
| `refresh_token` | The refresh token obtained in Step 2 |
| `grant_type` | Set to `refresh_token` |

### Example Request (cURL):
```sh
curl -X POST "https://accounts.zoho.com/oauth/v2/token" \
     -d "client_id=YOUR_CLIENT_ID" \
     -d "client_secret=YOUR_CLIENT_SECRET" \
     -d "refresh_token=YOUR_REFRESH_TOKEN" \
     -d "grant_type=refresh_token"
```

### Response:
```json
{
  "access_token": "1000.zzzzzzzz",
  "expires_in": 3600,
  "token_type": "Bearer"
}
```

- This **does not return a new refresh token**; the old one remains valid.
- Use the new `access_token` for API calls.

---

## Notes
- The `access_token` expires in **1 hour**.
- The `refresh_token` is long-lived and **does not expire unless revoked**.
- Always store the `refresh_token` securely, as it can be used to generate new access tokens.
- If you revoke permissions, users will have to go through the **Authorization Code Flow** again.


## Record Fields
- Portals
- Projects
- Users
- Bugs and Tasks
- Comments on Bugs and Tasks


## Workflow Overview
1. **User selects a portal** → The portal contains multiple projects where the user is a member.
2. **User selects a project** → Extract all users, bugs, and tasks from the selected project.
4. **Obtain Portal ID & Project ID** → Extracted from logs based on user selection from airdrop events.
3. **Fetch comments** → For each bug and task, retrieve associated comments.


## API Call Sequence
1. Retrieve **Portal ID** and **Project ID** from the airdrop events.
2. Fetch **all users** within the selected portal and project.
3. Fetch **issues and tasks** using the project and portal ID.
4. For every issue and task, fetch associated **comments** using their respective IDs.

## API Endpoints

### Issues / Bugs
```
GET https://projectsapi.zoho.com/restapi/portal/{portal_id}/projects/{project_id}/issues/
```
**Headers:**
- Authorization: Oauth access token
- Content-Type: application/json

**Response:**

{"bugs":[{"updated_time_long":1741175348281,"comment_count":"0","updated_time":"03-05-2025","assignee_zpuid":2447529000000056484,"flag":"Internal","updated_time_format":"03-05-2025 11:49:08 AM","link":{"timesheet":{"url":"https://projectsapi.zoho.com/restapi/portal/881214965/projects/2447529000000057070/bugs/2447529000000057232/logs/"},"web":{"url":"https://projects.zoho.com/portal/devrevdotai#buginfo/2447529000000057070/2447529000000057232"},"self":{"url":"https://projectsapi.zoho.com/restapi/portal/881214965/projects/2447529000000057070/bugs/2447529000000057232/"}},"description":"<div>2nd issue.&nbsp;<br><\/div>","title":"Issue 2","assignee_name":"Unassigned","reporter_id":"869457870","id":2447529000000057232,"has_log_hours":"false","escalation_level":"0","key":"SC1-I2","created_time_long":1741175348281,"severity":{"id":"2447529000000054197","type":"None"},"created_time":"03-05-2025","created_time_format":"03-05-2025 11:49:08 AM","reproducible":{"id":"2447529000000054056","type":"None"},"module":{"name":"None","id":"2447529000000054192"},"classification":{"id":"2447529000000054018","type":"None"},"tags":[],"GROUP_NAME":{"ASSOCIATED_TEAMS":{"AnyTeam":"Not Associated"},"ASSOCIATED_TEAMS_COUNT":0,"IS_TEAM_UNASSIGNED":true},"bug_number":"2","reporter_non_zuser":"false","reported_person":"Divyamsh Balaji","reporter_email":"divyamsh.balaji@devrev.ai","id_string":"2447529000000057232","closed":false,"bug_prefix":"SC1","attachment_count":"0","status":{"colorcode":"#2cc8ba","id":"2447529000000054087","type":"Open"}},{"updated_time_long":1741175215876,"comment_count":"1","updated_time":"03-05-2025","assignee_zpuid":2447529000000056484,"flag":"Internal","updated_time_format":"03-05-2025 11:46:55 AM","link":{"timesheet":{"url":"https://projectsapi.zoho.com/restapi/portal/881214965/projects/2447529000000057070/bugs/2447529000000057208/logs/"},"web":{"url":"https://projects.zoho.com/portal/devrevdotai#buginfo/2447529000000057070/2447529000000057208"},"self":{"url":"https://projectsapi.zoho.com/restapi/portal/881214965/projects/2447529000000057070/bugs/2447529000000057208/"}},"description":"<div>This is the first issue for testing ADaaS.&nbsp;<\/div>","title":"Issue 1 for ADaaS.","assignee_name":"Unassigned","reporter_id":"869457870","id":2447529000000057208,"has_log_hours":"false","escalation_level":"0","key":"SC1-I1","created_time_long":1741174965553,"severity":{"id":"2447529000000054197","type":"None"},"created_time":"03-05-2025","created_time_format":"03-05-2025 11:42:45 AM","reproducible":{"id":"2447529000000054056","type":"None"},"module":{"name":"None","id":"2447529000000054192"},"classification":{"id":"2447529000000054018","type":"None"},"tags":[{"name":"issues","id":"2447529000000057204","color_class":"bg-tag18"}],"GROUP_NAME":{"ASSOCIATED_TEAMS":{"AnyTeam":"Not Associated"},"ASSOCIATED_TEAMS_COUNT":0,"IS_TEAM_UNASSIGNED":true},"bug_number":"1","reporter_non_zuser":"false","reported_person":"Divyamsh Balaji","reporter_email":"divyamsh.balaji@devrev.ai","id_string":"2447529000000057208","closed":false,"bug_prefix":"SC1","attachment_count":"0","status":{"colorcode":"#2cc8ba","id":"2447529000000054087","type":"Open"}}]}

### Tasks
```
GET https://projectsapi.zoho.com/restapi/portal/{portal_id}/projects/{project_id}/tasks/
```
**Headers:**
- Authorization: Oauth access token
- Content-Type: application/json

**Response:**

{"tasks":[{"start_date_long":1741132800000,"is_comment_added":false,"end_date_format":"03-08-2025 12:00:00 AM","last_updated_time_long":1741243097902,"is_forum_associated":false,"details":{"owners":[{"zpuid":"2447529000000054003","full_name":"Divyamsh Balaji","work":"00:00","name":"Divyamsh","last_name":"Balaji","id":"869457870","first_name":"Divyamsh","email":"divyamsh.balaji@devrev.ai"}]},"id":2447529000000057190,"created_time":"03-05-2025","work":"00:00","start_date_format":"03-05-2025 12:00:00 AM","isparent":false,"work_type":"work_hrs_per_day","completed":false,"task_followers":{"FOLUSERS":"","FOLLOWERSIZE":-1,"FOLLOWERS":[]},"priority":"None","task_duration_as_work":false,"created_by":"869457870","last_updated_time":"03-06-2025","name":"Build ADaaS","is_docs_assocoated":false,"tasklist":{"name":"General","id_string":"2447529000000057188","id":"2447529000000057188"},"last_updated_time_format":"03-06-2025 06:38:17 AM","billingtype":"None","order_sequence":1,"status":{"name":"Open","id":"2447529000000016068","type":"open","color_code":"#74cb80"},"end_date":"03-08-2025","milestone_id":"2447529000000000073","link":{"timesheet":{"url":"https://projectsapi.zoho.com/restapi/portal/881214965/projects/2447529000000057070/tasks/2447529000000057190/logs/"},"web":{"url":"https://projects.zoho.com/portal/devrevdotai#zp/task-detail/2447529000000057190"},"self":{"url":"https://projectsapi.zoho.com/restapi/portal/881214965/projects/2447529000000057070/tasks/2447529000000057190/"}},"description":"<div>this is a test desciption<br /><\/div>","created_by_zpuid":"2447529000000054003","work_form":"standard_work","end_date_long":1741392000000,"duration":"4","created_by_email":"divyamsh.balaji@devrev.ai","key":"SC1-T1","start_date":"03-05-2025","created_person":"Divyamsh Balaji","created_time_long":1741174790501,"is_reminder_set":false,"is_recurrence_set":false,"created_time_format":"03-05-2025 11:39:50 AM","created_by_full_name":"Divyamsh Balaji","subtasks":false,"duration_type":"days","percent_complete":"0","GROUP_NAME":{"ASSOCIATED_TEAMS":{"AnyTeam":"Not Associated"},"ASSOCIATED_TEAMS_COUNT":0,"IS_TEAM_UNASSIGNED":true},"id_string":"2447529000000057190","log_hours":{"non_billable_hours":"0.0","billable_hours":"0.0"}}]}

### Users
```
GET https://projectsapi.zoho.com/restapi/portal/{portal_id}/projects/{project_id}/users/
```
**Headers:**
- Authorization: Oauth access token
- Content-Type: application/json

**Response:**

{"users":[{"profile_type":"1","role":"admin","portal_role_name":"Administrator","active":true,"zpuid":"2447529000000054003","project_profile_id":"2447529000000054443","profile_id":"2447529000000054443","name":"Divyamsh Balaji","portal_profile_name":"Portal Owner","portal_role_id":"2447529000000054005","id":"869457870","email":"divyamsh.balaji@devrev.ai","chat_access":true,"is_resource":false},{"profile_type":"6","role":"Manager","portal_role_name":"Administrator","active":true,"zpuid":"2447529000000057248","project_profile_id":"2447529000000054449","profile_id":"2447529000000054449","name":"Nithi Manivannan","portal_profile_name":"Manager","portal_role_id":"2447529000000054005","id":"869454928","email":"nithi.manivannan@devrev.ai","chat_access":true,"is_resource":false},{"profile_type":"7","role":"Employee","portal_role_name":"Administrator","active":true,"zpuid":"2447529000000057254","project_profile_id":"2447529000000054452","profile_id":"2447529000000054452","name":"DHIYANESHWAR G","portal_profile_name":"Employee","portal_role_id":"2447529000000054005","id":"871146308","email":"dhiyaneshwar.g@devrev.ai","chat_access":true,"is_resource":false}]}

### Comments on Issues
```
GET https://projectsapi.zoho.com/restapi/portal/{portal_id}/projects/{project_id}/issues/{issue_id}/comments/
```
**Headers:**
- Authorization: Oauth access token
- Content-Type: application/json

#### Response
```json
{
  "comments": [
    {
      "created_time_long": 1741246145780,
      "created_time": "03-06-2025",
      "thirdparty_attachments": [],
      "attachments": [],
      "last_modified_time": "03-06-2025",
      "created_time_format": "03-06-2025 07:29:05 AM",
      "project": {
        "name": "scooby",
        "id": "XXXXXXXXXXXXXXX"
      },
      "added_person": "******** ******",
      "content": "<div>hiii</div>",
      "last_modified_time_long": 1741246145780,
      "last_modified_time_format": "03-06-2025 07:29:05 AM",
      "sprints_notes_id": -1,
      "added_via": "web",
      "added_by": "XXXXXXXXX",
      "id_string": "XXXXXXXXXXXXXXX",
      "id": "XXXXXXXXXXXXXXX"
    }
  ]
}
```

### Comments on Tasks
```
GET https://projectsapi.zoho.com/restapi/portal/{portal_id}/projects/{project_id}/tasks/{task_id}/comments/
```
**Headers:**
- Authorization: Oauth access token
- Content-Type: application/json

#### Response
```json
{
  "comments": [
    {
      "created_time_long": 1741246218733,
      "updated_time_long": 1741246218733,
      "created_time": "03-06-2025",
      "updated_time": "03-06-2025",
      "created_time_format": "03-06-2025 07:30:18 AM",
      "added_by": "XXXXXXXXX",
      "updated_person": "******** ******",
      "updated_time_format": "03-06-2025 07:30:18 AM",
      "updated_by": "XXXXXXXXX",
      "comment": "<div>heylo</div>",
      "added_person": "******** ******",
      "commentdvt_id": "XXXXXXXXXXXXXXX"
    }
  ]
}
```
