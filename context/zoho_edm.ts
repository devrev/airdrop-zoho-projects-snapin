export default {
  schema_version: "v0.2.0",
  record_types: {
    issues: {
      name: "Issues",
      is_loadable: true,
      fields: {
        id: {
          type: "text",
          name: "Issue ID",
          is_required: true,
        },
        title: {
          type: "text",
          name: "Title",
          is_required: true,
        },
        description: {
          type: "rich_text",
          name: "Description",
        },
        bug_number: {
          type: "text",
          name: "Bug Number",
        },
        status: {
          type: "enum",
          name: "Status",
          is_required: true,
          enum: {
            values: [
              {
                key: "open",
                name: "Open",
              },
              {
                key: "closed",
                name: "Closed",
              },
            ],
          },
        },
        severity: {
          type: "reference",
          name: "Severity",
          reference: {
            refers_to: {
              "#record:severity": {},
            },
          },
        },
        assignee: {
          type: "reference",
          name: "Assignee",
          reference: {
            refers_to: {
              "#record:users": {},
            },
          },
        },
        reporter: {
          type: "reference",
          name: "Reporter",
          is_required: true,
          reference: {
            refers_to: {
              "#record:users": {},
            },
          },
        },
        created_time: {
          type: "timestamp",
          name: "Created Time",
        },
        updated_time: {
          type: "timestamp",
          name: "Updated Time",
        },
        comment_count: {
          type: "int",
          name: "Comment Count",
        },
        flag: {
          type: "text",
          name: "Flag",
        },
        html_url: {
          type: "text",
          name: "HTML URL",
        },
      },
    },
    tasks: {
      name: "Tasks",
      is_loadable: true,
      fields: {
        id: {
          type: "text",
          name: "Task ID",
          is_required: true,
        },
        name: {
          type: "text",
          name: "Task Name",
          is_required: true,
        },
        description: {
          type: "rich_text",
          name: "Description",
        },
        status: {
          type: "reference",
          name: "Status",
          is_required: true,
          reference: {
            refers_to: {
              "#record:task_status": {},
            },
          },
        },
        priority: {
          type: "text",
          name: "Priority",
        },
        owners: {
          type: "reference",
          name: "Owners",
          collection: {},
          reference: {
            refers_to: {
              "#record:users": {},
            },
          },
        },
        start_date: {
          type: "timestamp",
          name: "Start Date",
        },
        end_date: {
          type: "timestamp",
          name: "End Date",
        },
        created_time: {
          type: "timestamp",
          name: "Created Time",
        },
        last_updated_time: {
          type: "timestamp",
          name: "Last Updated Time",
        },
        completed: {
          type: "bool",
          name: "Is Completed",
        },
        percent_complete: {
          type: "text",
          name: "Percent Complete",
        },
        html_url: {
          type: "text",
          name: "HTML URL",
        },
      },
    },
    users: {
      name: "Users",
      is_loadable: true,
      fields: {
        id: {
          type: "text",
          name: "User ID",
          is_required: true,
        },
        name: {
          type: "text",
          name: "Name",
          is_required: true,
        },
        email: {
          type: "text",
          name: "Email",
          is_required: true,
        },
        role: {
          type: "text",
          name: "Role",
        },
        profile_type: {
          type: "text",
          name: "Profile Type",
        },
        active: {
          type: "bool",
          name: "Is Active",
        },
      },
    },
    comments: {
      name: "Comments",
      is_loadable: true,
      fields: {
        id: {
          type: "text",
          name: "Comment ID",
          is_required: true,
        },
        content: {
          type: "rich_text",
          name: "Content",
          is_required: true,
        },
        added_by: {
          type: "reference",
          name: "Added By",
          is_required: true,
          reference: {
            refers_to: {
              "#record:users": {},
            },
          },
        },
        parent_type: {
          type: "enum",
          name: "Parent Type",
          is_required: true,
          enum: {
            values: [
              {
                key: "issue",
                name: "Issue",
              },
              {
                key: "task",
                name: "Task",
              },
            ],
          },
        },
        parent_id: {
          type: "text",
          name: "Parent ID",
          is_required: true,
        },
        created_time: {
          type: "timestamp",
          name: "Created Time",
        },
        updated_time: {
          type: "timestamp",
          name: "Updated Time",
        },
      },
    },
    severity: {
      name: "Severity",
      is_loadable: true,
      fields: {
        id: {
          type: "text",
          name: "Severity ID",
          is_required: true,
        },
        type: {
          type: "text",
          name: "Type",
          is_required: true,
        },
      },
    },
    task_status: {
      name: "Task Status",
      is_loadable: true,
      fields: {
        id: {
          type: "text",
          name: "Status ID",
          is_required: true,
        },
        name: {
          type: "text",
          name: "Name",
          is_required: true,
        },
        type: {
          type: "text",
          name: "Type",
          is_required: true,
        },
        color_code: {
          type: "text",
          name: "Color Code",
        },
      },
    },
  },
};
