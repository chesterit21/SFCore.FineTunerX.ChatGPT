using System.Diagnostics;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllersWithViews().AddRazorRuntimeCompilation();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

// === Start Python Engine Automatically ===
// string pythonPath = "python"; // bisa diubah ke "python3" atau dari appsettings.json
// string scriptPath = Path.Combine(Directory.GetParent(Directory.GetCurrentDirectory())!.FullName, "FineTuneEngine", "app.py");

// try
// {
//     var process = new Process();
//     process.StartInfo.FileName = pythonPath;
//     process.StartInfo.Arguments = $"\"{scriptPath}\"";
//     process.StartInfo.UseShellExecute = false;
//     process.StartInfo.RedirectStandardOutput = true;
//     process.StartInfo.RedirectStandardError = true;
//     process.StartInfo.CreateNoWindow = true;
//     process.OutputDataReceived += (s, e) => { if (!string.IsNullOrEmpty(e.Data)) Console.WriteLine($"[Python] {e.Data}"); };
//     process.ErrorDataReceived += (s, e) => { if (!string.IsNullOrEmpty(e.Data)) Console.WriteLine($"[Python-ERR] {e.Data}"); };

//     process.Start();
//     process.BeginOutputReadLine();
//     process.BeginErrorReadLine();

//     Console.WriteLine("✅ Python FineTuneEngine started successfully.");
// }
// catch (Exception ex)
// {
//     Console.WriteLine("⚠️ Failed to start Python engine: " + ex.Message);
// }

app.UseHttpsRedirection();
app.UseRouting();

app.UseAuthorization();

app.MapStaticAssets();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}")
    .WithStaticAssets();


app.Run();
