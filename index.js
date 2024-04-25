require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY
);
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_ADMIN_NODE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ADMIN_NODE_KEY
);

// Example batch size
// Define the batch size for pagination
const pageSize = 4000;

async function fetchAndUploadData() {
  let pageIndex = 0;
  let hasMore = true;

  while (hasMore) {
    let {
      data: readData,
      error: readError,
      count,
    } = await supabase
      .from("reviews-2") // Replace 'source_table' with your source table name
      .select("*", { count: "exact" })
      .order('id', { ascending: true })  // Ensure consistent ordering by a unique column
      .range(pageIndex * pageSize, (pageIndex + 1) * pageSize - 1);

    if (readError) {
      console.error("Error fetching data:", readError);
      return;
    }

    if (readData.length === 0) {
      hasMore = false; // Stop the loop if no more data is returned
    } else {
      console.log(
        `Fetched ${readData.length} records in batch ${pageIndex + 1}.`
      );

      // Upload each batch to the destination table
      let { data: insertData, error: insertError } = await supabaseAdmin
        .from("reviews-3") // Replace 'destination_table' with your target table name
        .insert(readData);

      if (insertError) {
        console.error("Error inserting data:", insertError);
        return;
      }

      console.log(`Data inserted for batch ${pageIndex + 1}:`, insertData);
      pageIndex++; // Increment to fetch the next batch
    }
  }
}

fetchAndUploadData();
