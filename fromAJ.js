for (const item of data_ids) {

    //console.log(item.product_id);

const { data, error:ytyu } = await supabase.from('Products').select('sku,make,model,year_generation,type').eq('id',item.product_id);
const { data: existingModel, error: modelError } = await supabase
.from('Model')
.select('id')
.eq('name', data[0].model)
.single();

// Check if the make exists
const { data: existingMake, error: makeError } = await supabase
.from('Make')
.select('id')
.eq('name', data[0].make)
.single();


// If model doesn't exist, insert it
if (existingModel === null && !modelError) {
 const { data: insertedModel, error: insertModelError } = await supabase
  .from('Model')
  .insert([{ name: data[0].model }])
  .onConflict('name')
  .ignore();

    if (insertModelError) {
  // Handle error while inserting model
  console.error('Error inserting model:', insertModelError.message);
  }
    }

// If make doesn't exist, insert it
  if (existingMake === null  && !makeError) {
  const { data: insertedMake, error: insertMakeError } = await supabase
  .from('Make')
  .insert([{ name: data[0].make }])
  .onConflict('name')
  .ignore();

      if (insertMakeError) {
  // Handle error while inserting make
       console.error('Error inserting make:', insertMakeError.message);
   }
  }
    const { data:type, error } = await supabase
    .from('Type')
    .select('id')
    .eq('name',data[0].type)
    .single();

    const { data: model,error:err_model } = await supabase
    .from('Model')
    .select('id')
    .eq('name',data[0].model)
    .single();
    const { data: make,error:err_make } = await supabase
    .from('Make')
    .select('*')
    .eq('name',data[0].make)
    .single();
    const [startYear, endYear] = data[0].year_generation.split("-").map(year => parseInt(year));

    for (let year = startYear; year <= endYear; year++) {
    
       const { data: date,error:err_date } = await supabase
      .from('Years')
       .select('id')
       .eq('name',year)
       .single();
    if (date?.id && type?.id && make?.id && model?.id) {
 
    const { data: existingRelation, error: relationError } = await supabase
  .from('relations_product')
  .select('id')
  .eq('year_id', date.id)
  .eq('model_id', model?.id)
  .eq('make_id', make.id)
  .eq('type_id', type.id)
  .eq('product_id', item);

   // If the combination already exists, log a message or handle it as needed
if (existingRelation && existingRelation.length > 0) {
    console.log('Combination of IDs already exists in the database.');
} else {
  // If the combination doesn't exist, insert the new data
  const { data: relation_data, error: relationInsertError } = await supabase
      .from('relations_product')
      .insert([{ year_id: date.id, model_id: model?.id, make_id: make.id, type_id: type.id, product_id: item.product_id }]);
      if(relationInsertError){
        console.log(relationInsertError);
      }
      } 
    }
  }
}