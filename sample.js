import * as dotenv from 'dotenv';
import fs from 'fs';
import { Octokit } from '@octokit/rest';
import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";

// Load environment variables
dotenv.config();

// Check if GitHub token exists in environment variables
const githubToken = process.env.GITHUB_TOKEN;
const token = process.env["GITHUB_TOKEN"];
const endpoint = "https://models.github.ai/inference";
const modelName = "openai/gpt-4o";

async function main() {
  try {
    // Verify token existence without logging its value
    if (!githubToken) {
      console.error('Error: GITHUB_TOKEN environment variable is not set');
      console.log('Please add your GitHub token to the .env file:');
      console.log('GITHUB_TOKEN=your_github_token');
      process.exit(1);
    }

    console.log('GitHub token found in environment variables');
    
    // Initialize Octokit with the token
    const octokit = new Octokit({
      auth: githubToken
    });

    // Use the token safely (example: list user's repositories)
    const { data: repos } = await octokit.repos.listForAuthenticatedUser();
    console.log(`Found ${repos.length} repositories`);
    
    // Process the image file
    const imagePath = './contoso_layout_sketch.jpg';
    let imageData = null;
    
    if (fs.existsSync(imagePath)) {
      console.log('Image file found: contoso_layout_sketch.jpg');
      // Read and encode the image to base64
      const imageBuffer = fs.readFileSync(imagePath);
      imageData = imageBuffer.toString('base64');
      console.log('Image successfully encoded to base64');
    } else {
      console.log('Image file not found: contoso_layout_sketch.jpg');
      process.exit(1);
    }

    // Initialize the model client
    const client = ModelClient(
      endpoint,
      new AzureKeyCredential(token),
    );

    console.log('Sending request to generate HTML and CSS from sketch...');
    
    // Create the request with image data
    const response = await client.path("/chat/completions").post({
      body: {
        messages: [
          { 
            role: "system", 
            content: "You are a helpful web developer assistant. Generate clean, responsive HTML and CSS code based on sketch images."
          },
          { 
            role: "user", 
            content: [
              {
                type: "text", 
                text: "Write HTML and CSS code for a web page based on the following hand-drawn sketch."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageData}`
                }
              }
            ]
          }
        ],
        temperature: 0.7,
        top_p: 1.0,
        max_tokens: 4000,
        model: modelName
      }
    });

    if (isUnexpected(response)) {
      throw response.body.error;
    }

    // Get the generated code
    const generatedCode = response.body.choices[0].message.content;
    
    // Print the result
    console.log("\nGenerated HTML and CSS:");
    console.log(generatedCode);
    
    // Save the generated code to a file
    fs.writeFileSync('generated_webpage.html', generatedCode);
    console.log('\nCode saved to generated_webpage.html');
    
  } catch (error) {
    console.error('An error occurred:', error);
    if (error.response) {
      console.error('Response error:', error.response.data);
    }
  }
}

main().catch((err) => {
  console.error("The sample encountered an error:", err);
});
