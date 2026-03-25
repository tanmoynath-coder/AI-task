┌──────────────────────────────────────┬───────────────────┬───────────────────────────────────────────────────────────┐    
  │            Prompt Version            │  Output Quality   │                      Key Difference                       │ 
  ├──────────────────────────────────────┼───────────────────┼───────────────────────────────────────────────────────────┤    
  │ V1: "Explain this code."             │ Basic             │ Single-paragraph explanation. Identifies duplication. No  │ 
  │                                      │ understanding     │ structure.                                                │    
  ├──────────────────────────────────────┼───────────────────┼───────────────────────────────────────────────────────────┤    
  │ V2: "Explain what this code does.    │ Intermediate      │ Structured sections (explanation, issues, improvements).  │    
  │ Identify any issues and suggest      │ analysis          │ Refactored code provided. Still surface-level.            │    
  │ improvements."                       │                   │                                                           │    
  ├──────────────────────────────────────┼───────────────────┼───────────────────────────────────────────────────────────┤ 
  │ V3: Senior engineer persona + 8      │                   │ Deep analysis: idempotency, concurrency, security,        │
  │ explicit sections + constraints ("Be │ Production-grade  │ transaction boundaries, rollback logic, audit logging,    │    
  │  precise. Do not give generic        │ review            │ authorization. Executable refactored code with error      │
  │ advice.")                            │                   │ types, constants, JSDoc.                                  │    
  └──────────────────────────────────────┴───────────────────┴───────────────────────────────────────────────────────────┘

  ---
  What Drove the Improvement
                                                                                                                              
  ┌───────────────┬───────────────────────────────┬─────────────────────────────────────────────────┐
  │    Factor     │            V1 → V2            │                     V2 → V3                     │                         
  ├───────────────┼───────────────────────────────┼─────────────────────────────────────────────────┤                         
  │ Specificity   │ Added "issues + improvements" │ Added 8 explicit sections                       │                         
  ├───────────────┼───────────────────────────────┼─────────────────────────────────────────────────┤                         
  │ Persona       │ None                          │ "Senior backend engineer"                       │                         
  ├───────────────┼───────────────────────────────┼─────────────────────────────────────────────────┤                         
  │ Constraints   │ None                          │ "Be precise. Do not give generic advice"        │                         
  ├───────────────┼───────────────────────────────┼─────────────────────────────────────────────────┤                         
  │ Structure     │ Free-form                     │ Mandatory section headers                       │
  ├───────────────┼───────────────────────────────┼─────────────────────────────────────────────────┤                         
  │ Depth signals │ None                          │ "Edge cases", "idempotency", "failure handling" │
  └───────────────┴───────────────────────────────┴─────────────────────────────────────────────────┘                         
                  
  ---                                                                                                                         
  Key Takeaway    
                                                                                                                              
  Prompt specificity ∝ Output depth
                                                                                                                              
  The V3 prompt works because it:                                                                                             
  1. Sets expertise level (senior engineer)                                                                                   
  2. Defines exact output structure (8 sections)                                                                              
  3. Names specific concerns (idempotency, concurrency, security)
  4. Constrains vagueness ("Do not give generic advice")                                                                      
  5. Requires actionable deliverables (refactored code)   