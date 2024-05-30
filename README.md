# Supbase Node Upload

This was created for two reasons.
1. Inserting reviews-2 table from the old CoverlandDB database to move it to the adminNodePanel database. I think reviews-2 was too big to save and upload so I just wrote a script to move the databases
2. Creating relational table. Got the logic from AJ but just took what I needed to create the table. TODO: Need to be able to run the script but detect that the product already exists in the table and then skip over it.


## How To Use

Create Relational Table
1. Update the table names 
2. Run the script

If you run into an error about ID conflict, check saved queries in supabase and find one that resets the sequence. Or look up how to reset the table sequence (sequence keeps track of the id to use when incrementing the PK)

Other common problems: make/model/year doesn't exist in their respective table. Look up if there are new make/model. Also double check because sometimes there are just typos that need to be fixed.

Relation doesn't exist: Make sure the foreign keys are pointed to the right tables.