{
  "schema_version": "v0.2.0", 
  "record_types":{
    "issues": {
      "name": "Issues",
      "is_loadable": true,
      "fields": {
        "number": {
          "type": "int",
          "name": "GitHub Issue Number"
        },
        "title": {
          "type": "text",
          "name": "Title",
          "is_required": true
        },
        "body": {
          "type": "rich_text",
          "name": "Body",
          "is_required": true
        },
        "id":{
          "type":"int",
          "name":"Issue ID"
        },
        "state": {
          "type": "enum",
          "name": "State",
          "is_required": true,
          "enum": {
            "values": [
              {
                "key": "open",
                "name": "Open"
              },
              {
                "key": "closed",
                "name": "Closed"
              }
            ]
          }
        },
        "closing_state_reason": {
          "type": "enum",
          "name": "State Reason for Closing",
          "enum":{
            "values":[
              {
                "key":"completed",
                "name":"Completed"
              },
              {
                "key":"not_planned",
                "name":"Not Planned"
              }
            ]
          }
        },
        "created_by": {
          "type": "reference",
          "name": "Creator of the issue",
          "is_required": true,
          "reference": {
            "refers_to": {
              "#record:assignees": {
              }
            }
          }
        },
        "closed_by": {
          "type": "reference",
          "name": "Closed By",
          "reference": {
            "refers_to": {
              "#record:assignees": {
              }
            }
          }
        },
        "assignees": {
          "type": "reference",
          "name": "Assignees",
          "is_required": true,
          "collection": {},
          "reference": {
            "refers_to": {
              "#record:assignees": {
              }
            }
          }
        },
        "labels": {
          "type": "reference",
          "name": "Labels",
          "is_required": true,
          "collection": {},
          "reference": {
            "refers_to": {
              "#record:labels": {}
            }
          }
        },
        "locked": {
          "type": "bool",
          "name": "Locked"
        },
        "created_at": {
          "type": "timestamp",
          "name": "Created At"
        },
        "updated_at": {
          "type": "timestamp",
          "name": "Updated At"
        },
        "closed_at": {
          "type": "timestamp",
          "name": "Closed At"
        },
        "author_association": {
          "type": "text",
          "name": "Author Association"
        },
        "html_url": {
          "type": "text",
          "name": "Github Issue URL"
        },
        "repository_url": {
          "type": "text",
          "name": "Repository URL"
        }
      }
    },
    "assignees": {
      "name": "Assignees",  
      "fields": {
        "user_id": {
          "type": "text",
          "name": "Username",
          "is_required": true
        },
        "type": {
          "type": "text",
          "name": "User Type"
        },
        "html_url": {
          "type": "text",
          "name": "Profile URL"
        },
        "site_admin": {
          "type": "bool",
          "name": "Is Admin"
        }
      }
    },
    "comments": {
      "name": "Comments",
      "is_loadable": true,
      "fields": {
        "body": {
          "type": "rich_text",
          "name": "Body"
        },
        "issue_id":{
          "name":"Issue ID",
          "type": "int"
        },
        "user_id": {
          "type": "reference",
          "name": "Commenter",
          "is_required": true,
          "reference": {
            "refers_to": {
              "#record:assignees": {
              }
            }
          }
        },
        "issue_url": {
          "type": "reference",
          "name": "Issue URL of the Comment",
          "reference": {
            "refers_to": {
              "#record:issues": {}
            }
          }
        },
        "html_url": {
          "type": "text",
          "name": "HTML URL"
        },
        "created_at": {
          "type": "timestamp",
          "name": "Created At"
        },
        "updated_at": {
          "type": "timestamp",
          "name": "Updated At"
        },
        "author_association": {
          "type": "text",
          "name": "Author Association"
        }
      }
    },
    "labels": {
      "name": "Labels",
      "is_loadable": true,
      "fields": {
        "name": {
          "type": "text",
          "name": "Name",
          "is_required": true
        },
        "description": {
          "type": "rich_text",
          "name": "Description"
        },
        "color": {
          "type": "text",
          "name": "Color"
        },
        "default": {
          "type": "bool",
          "name": "Is Default"
        },
        "url": {
          "type": "text",
          "name": "URL"
        }
      }
    }
  }
}
