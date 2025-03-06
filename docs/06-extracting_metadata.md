# Extract Metadata Phase

During the `EXTRACT_METADATA` phase, the Worker must provide a JSON file named `initial_domain_mapping.json`,
and upload it as an Artifact with item type `initial_domain_mapping`.

The file provides mappings between External System domain entities and DevRev domain entities.

For each extracted domain entity from the External System,
the Extractor must provide at least one mapping to a DevRev domain entity.

If two or more possible mappings are provided within `possible_targets`, end-users will be able to select
to what DevRev domain entity they would like to have it transformed during the mapping phase of the extraction.

In the `initial_field mappings` all required fields for a specific DevRev domain entity must be specified
(e.g., DevRev Issues must have a priority, users must have a name etc.).
Developers can provide additional mappings.
Attributes from the extracted objects that do not have mappings specified will be imported as custom fields.

Example:
```json
{
  "initial_object_mappings": [
    {
      "external_type": "{{A: external entity representing company (customer of the devorg)}}",
      "possible_targets": {
        "account": {
          "initial_field_mappings": [
            {
              "destination_field": {
                "id": "created_by_id"
              },
              "is_immutable": true,
              "selected_resolutions": [
                "{{F: a field in A representing reference to the user who created this company}}"
              ],
              "resolutions": {
                "{{F}}": {
                  "source_field_description": {
                    "id": "{{F}}",
                    "is_required": true
                  }
                }
              },
              "is_finished": true
            },
            {
              "destination_field": {
                "id": "description"
              },
              "is_immutable": true,
              "selected_resolutions": [
                "{{F1: a field in A representing the rich (or plain) text description of the company}}"
              ],
              "resolutions": {
                "{{F1}}": {
                  "source_field_description": {
                    "id": "{{F1}}",
                    "is_required": true
                  }
                }
              },
              "is_finished": true
            },
            {
              "destination_field": {
                "id": "display_name",
                "is_required": true
              },
              "selected_resolutions": [
                "{{F2: a field in A representing the name of the company}}"
              ],
              "resolutions": {
                "{{F2}}": {
                  "source_field_description": {
                    "id": "{{F2}}",
                    "is_required": true
                  }
                }
              },
              "is_finished": true
            },
            {
              "destination_field": {
                "id": "id",
                "is_required": true
              },
              "selected_resolutions": [
                "{{F3: The primary key of A}}"
              ],
              "resolutions": {
                "{{F3}}": {
                  "source_field_description": {
                    "id": "{{F3}}",
                    "is_required": true
                  }
                }
              },
              "is_finished": true
            },
            {
              "destination_field": {
                "id": "owned_by",
                "is_required": true
              },
              "selected_resolutions": [
                "{{F4: a field in A representing an employee responsible for the given customer}}"
              ],
              "resolutions": {
                "{{F4}}": {
                  "source_field_description": {
                    "id": "{{F4}}",
                    "is_required": true
                  }
                }
              },
              "is_finished": true
            },
            {
              "destination_field": {
                "id": "state",
                "is_required": true
              },
              "selected_resolutions": [
                "obj_make_from_value"
              ],
              "resolutions": {
                "obj_make_from_value": {
                  "source_field_description": {
                    "id": "obj_make_from_value"
                  },
                  "dependent_decisions": [
                    {
                      "source_value": {
                        "id": "\"any\"",
                        "name": "\"any\""
                      },
                      "selected_resolution": "\"ACTIVE\"",
                      "resolutions": {
                        "\"ACTIVE\"": {
                          "id": "\"ACTIVE\"",
                          "name": "\"ACTIVE\""
                        }
                      },
                      "is_finished": true
                    }
                  ]
                }
              },
              "is_finished": true
            },
            {
              "destination_field": {
                "id": "websites"
              },
              "is_immutable": true,
              "selected_resolutions": [
                "{{F5: A field in A representing domains or domain of the company}}"
              ],
              "resolutions": {
                "{{F5}}": {
                  "source_field_description": {
                    "id": "{{F5}}",
                    "is_required": true
                  }
                }
              },
              "is_finished": true
            }
          ]
        }
      },
      "default_target": "account",
      "allow_item_type_decisions": true,
      "is_customizable": true
    },
    {
      "external_type": "{{B: an external entity type representing contacts: employees of customers (or private consumers)}}",
      "possible_targets": {
        "rev_user": {
          "initial_field_mappings": [
            {
              "destination_field": {
                "id": "display_name",
                "is_required": true
              },
              "selected_resolutions": [
                "{{F: a field in B with the display name of the contact in the External System}}"
              ],
              "resolutions": {
                "{{F}}": {
                  "source_field_description": {
                    "id": "{{F}}",
                    "is_required": true
                  }
                }
              },
              "is_finished": true
            },
            {
              "destination_field": {
                "id": "email"
              },
              "is_immutable": true,
              "selected_resolutions": [
                "{{F1: a field in B representing the email of the contact}}"
              ],
              "resolutions": {
                "{{F1}}": {
                  "source_field_description": {
                    "id": "{{F1}}",
                    "is_required": true
                  }
                }
              },
              "is_finished": true
            },
            {
              "destination_field": {
                "id": "external_uid"
              },
              "is_immutable": true,
              "selected_resolutions": [
                "{{F2: a field in B containing an unique id of the contact. Can be the same as email}}"
              ],
              "resolutions": {
                "{{F2}}": {
                  "source_field_description": {
                    "id": "{{F2}}",
                    "is_required": true
                  }
                }
              },
              "is_finished": true
            },
            {
              "destination_field": {
                "id": "full_name"
              },
              "is_immutable": true,
              "selected_resolutions": [
                "{{F3: a field in B with the name of the contact}}"
              ],
              "resolutions": {
                "{{F3}}": {
                  "source_field_description": {
                    "id": "{{F3}}",
                    "is_required": true
                  }
                }
              },
              "is_finished": true
            },
            {
              "destination_field": {
                "id": "id",
                "is_required": true
              },
              "selected_resolutions": [
                "{{F4: The field holding the primary key of be}}"
              ],
              "resolutions": {
                "{{F4}}": {
                  "source_field_description": {
                    "id": "{{F4}}",
                    "is_required": true
                  }
                }
              },
              "is_finished": true
            },
            {
              "destination_field": {
                "id": "phone_numbers"
              },
              "is_immutable": true,
              "selected_resolutions": [
                "{{F5}}"
              ],
              "resolutions": {
                "{{F5}}": {
                  "source_field_description": {
                    "id": "{{F5}}",
                    "is_required": true
                  }
                }
              },
              "is_finished": true
            },
            {
              "destination_field": {
                "id": "rev_org"
              },
              "is_immutable": true,
              "selected_resolutions": [
                "{{F6: a field in B referencing the customer the given contact belongs to}}"
              ],
              "resolutions": {
                "{{F6}}": {
                  "source_field_description": {
                    "id": "{{F6}}",
                    "is_required": true
                  }
                }
              },
              "is_finished": true
            }
          ]
        }
      },
      "default_target": "rev_user",
      "allow_item_type_decisions": true,
      "is_customizable": true
    },
    {
      "external_type": "{{C: an external entity type representing a dev user (an employee of the devorg)}}",
      "possible_targets": {
        "dev_user": {
          "initial_field_mappings": [
            {
              "destination_field": {
                "id": "display_name",
                "is_required": true
              },
              "selected_resolutions": [
                "{{F1}}"
              ],
              "resolutions": {
                "{{F1}}": {
                  "source_field_description": {
                    "id": "{{F1}}",
                    "is_required": true
                  }
                }
              },
              "is_finished": true
            },
            {
              "destination_field": {
                "id": "email"
              },
              "is_immutable": true,
              "selected_resolutions": [
                "{{F2}}"
              ],
              "resolutions": {
                "{{F2}}": {
                  "source_field_description": {
                    "id": "{{F2}}",
                    "is_required": true
                  }
                }
              },
              "is_finished": true
            },
            {
              "destination_field": {
                "id": "external_identities,display_name"
              },
              "is_immutable": true,
              "selected_resolutions": [
                "{{F1}}"
              ],
              "resolutions": {
                "{{F1}}": {
                  "source_field_description": {
                    "id": "{{F1}}",
                    "is_required": true
                  }
                }
              },
              "is_finished": true
            },
            {
              "destination_field": {
                "id": "external_identities,id"
              },
              "is_immutable": true,
              "selected_resolutions": [
                "{{F2: a field in C with an unique id of the user}}"
              ],
              "resolutions": {
                "{{F2}}": {
                  "source_field_description": {
                    "id": "{{F2}}",
                    "is_required": true
                  }
                }
              },
              "is_finished": true
            },
            {
              "destination_field": {
                "id": "full_name"
              },
              "is_immutable": true,
              "selected_resolutions": [
                "{{F3}}"
              ],
              "resolutions": {
                "{{F3}}": {
                  "source_field_description": {
                    "id": "{{F3}}",
                    "is_required": true
                  }
                }
              },
              "is_finished": true
            },
            {
              "destination_field": {
                "id": "id",
                "is_required": true
              },
              "selected_resolutions": [
                "{{F2}}"
              ],
              "resolutions": {
                "{{F2}}": {
                  "source_field_description": {
                    "id": "{{F2}}",
                    "is_required": true
                  }
                }
              },
              "is_finished": true
            }
          ]
        }
      },
      "default_target": "dev_user",
      "allow_item_type_decisions": true
    },
    {
      "external_type": "{{D: an external type representing a ticket-like piece of work}}",
      "possible_targets": {
        "work.ticket": {
          "initial_field_mappings": [
            {
              "destination_field": {
                "id": "created_by_id"
              },
              "is_immutable": true,
              "selected_resolutions": [
                "{{F1}}"
              ],
              "resolutions": {
                "{{F1}}": {
                  "source_field_description": {
                    "id": "{{F1}}",
                    "is_required": true
                  }
                }
              },
              "is_finished": true
            },
            {
              "destination_field": {
                "id": "created_date"
              },
              "is_immutable": true,
              "selected_resolutions": [
                "{{F2: a field in D with the creation timestamp}}"
              ],
              "resolutions": {
                "{{F2}}": {
                  "source_field_description": {
                    "id": "{{F2}}",
                    "is_required": true
                  }
                }
              },
              "is_finished": true
            },
            {
              "destination_field": {
                "id": "id",
                "is_required": true
              },
              "selected_resolutions": [
                "{{F3}}"
              ],
              "resolutions": {
                "{{F3}}": {
                  "source_field_description": {
                    "id": "{{F3}}",
                    "is_required": true
                  }
                }
              },
              "is_finished": true
            },
            {
              "destination_field": {
                "id": "modified_date"
              },
              "is_immutable": true,
              "selected_resolutions": [
                "{{F4}}"
              ],
              "resolutions": {
                "{{F4}}": {
                  "source_field_description": {
                    "id": "{{F4}}",
                    "is_required": true
                  }
                }
              },
              "is_finished": true
            },
            {
              "destination_field": {
                "id": "owned_by_ids",
                "is_required": true
              },
              "selected_resolutions": [
                "{{F5: A field in D referencing an user assigned to the ticket}}"
              ],
              "resolutions": {
                "{{F5}}": {
                  "source_field_description": {
                    "id": "{{F5}}",
                    "is_required": true
                  }
                }
              },
              "is_finished": true
            },
            {
              "destination_field": {
                "id": "reported_by_ids"
              },
              "is_immutable": true,
              "selected_resolutions": [
                "{{F6}}"
              ],
              "resolutions": {
                "{{F6}}": {
                  "source_field_description": {
                    "id": "{{F6}}",
                    "is_required": true
                  }
                }
              },
              "is_finished": true
            },
            {
              "destination_field": {
                "id": "rev_oid"
              },
              "is_immutable": true,
              "selected_resolutions": [
                "{{F6: A field in D referencing the customer who this ticket belongs to}}"
              ],
              "resolutions": {
                "{{F6}}": {
                  "source_field_description": {
                    "id": "{{F6}}",
                    "is_required": true
                  }
                }
              },
              "is_finished": true
            },
            {
              "destination_field": {
                "id": "severity",
                "is_required": true
              },
              "selected_resolutions": [
                "{{F7: an enum field in D with values representing the severity of the ticket}}"
              ],
              "resolutions": {
                "{{F7}}": {
                  "source_field_description": {
                    "id": "{{F7}}",
                    "is_required": true
                  },
                  "dependent_decisions": [
                    {
                      "source_value": {
                        "id": "{{V1}}: A quoted value of the severity in the External System, eg \"Low\""
                      },
                      "selected_resolution": "{{DV1}}: A quoted value of the devrev ticket severity this value is mapped to, on of \"low\", \"medium\" \"high\" or \"blocker\"",
                      "resolutions": {
                        "{{DV1}}": {
                          "id": "{{DV1}}"
                        }
                      },
                      "is_finished": true
                    },
                    {
                      "{{all other possible severity values in the External System}}": "{{mapped similarly}}"
                    }
                  ]
                }
              },
              "is_finished": true
            },
            {
              "destination_field": {
                "id": "stage,name",
                "is_required": true
              },
              "selected_resolutions": [
                "{{F8}}"
              ],
              "resolutions": {
                "{{F8}}": {
                  "source_field_description": {
                    "id": "{{F8}}",
                    "is_required": true
                  },
                  "dependent_decisions": [
                    "Value mappings in the same format as for severity, the allowed devrev values are:",
                    "resolved",
                    "queued",
                    "work_in_progress",
                    "awaiting_product_assist",
                    "awaiting_development",
                    "in_development",
                    "awaiting_customer_response",
                    "canceled"
                  ]
                }
              },
              "is_finished": true
            },
            {
              "destination_field": {
                "id": "target_close_date"
              },
              "is_immutable": true,
              "selected_resolutions": [
                "{{F9}}"
              ],
              "resolutions": {
                "{{F9}}": {
                  "source_field_description": {
                    "id": "{{F9}}",
                    "is_required": true
                  }
                }
              },
              "is_finished": true
            },
            {
              "destination_field": {
                "id": "title",
                "is_required": true
              },
              "selected_resolutions": [
                "{{F10}}"
              ],
              "resolutions": {
                "{{F10}}": {
                  "source_field_description": {
                    "id": "{{F10}}",
                    "is_required": true
                  }
                }
              },
              "is_finished": true
            }
          ]
        }
      },
      "default_target": "work.ticket",
      "allow_item_type_decisions": true,
      "is_customizable": true
    }
  ],
  "external_system_short_name": "{{N: A short name of the External System}}"
}
```
