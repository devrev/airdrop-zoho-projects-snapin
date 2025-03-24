# Airdrop-as-a-Service (ADaaS)  

## Overview  
**Airdrop** is DevRev’s data migration and synchronization solution, enabling customers to:  
- **Import** existing data from external systems into DevRev.   
- **Sync** data between DevRev and external systems in real time.  

**Airdrop-as-a-Service (ADaaS)** extends Airdrop’s capabilities to snap-in developers, allowing them to integrate with DevRev’s data pipeline. ADaaS enables the creation of **external workers**—known as **extractors** and **loaders**—that facilitate data exchange between DevRev and third-party systems.  

## Extractors  
An **extractor** is a function within an ADaaS-capable snap-in that retrieves data from an **external system** (e.g., Jira, Zendesk, HubSpot). Extractors communicate with Airdrop using a standardized protocol and adhere to a unified data structure, ensuring seamless data ingestion into DevRev.  

---  

## Sync Modes  

### **Initial Import**  
The **initial import** is the first-time data transfer from an external system to DevRev, manually triggered via DevRev’s **Imports** UI.  

**Phases of an initial import:**  
1. **External Sync Units Extraction** – Identifies and retrieves sync-eligible data.  
2. **Metadata Extraction** – Extracts system-level information.  
3. **Data Extraction** – Extracts core domain objects.  
4. **Attachments Extraction** – Extracts associated files or assets.  

---  

### **1-Way Sync**  
A **1-way sync** occurs after an initial import, ensuring DevRev remains up to date with changes in the external system. It extracts newly created or updated data since the last successful sync.  

**Key characteristics:**  
- Extractors rely on **state management** to track the last successful sync timestamp.  
- Snap-ins must **persist state** across sync runs.  
- Only modified or new domain objects are extracted.  

**Phases of a 1-way sync:**  
1. **External Sync Units Extraction**  
2. **Metadata Extraction**  
3. **Data Extraction**  
4. **Attachments Extraction**  
