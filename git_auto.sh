git add . -A

echo 'Enter the commit message:'
read commitMessage
git commit -m "$commitMessage"

git log \
    --pretty=format:'{%n  "commit": "%H",%n  "author": "%an <%ae>",%n  "date": "%ad",%n  "message": "%s"%n},' \
    $@ | \
    perl -pe 'BEGIN{print "["}; END{print "]\n"}' | \
    perl -pe 's/},]/}]/' > logs.json
    
git commit --amend --no-edit