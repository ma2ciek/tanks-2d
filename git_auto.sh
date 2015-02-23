git add . -A

echo 'Enter the commit message:'
read commitMessage
git commit -m "$commitMessage"

git log-json > logs.json
git commit --ammend --no-edit