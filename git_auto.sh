git add . -A

echo 'Enter the commit message:'
read commitMessage
git commit -m "$commitMessage"

git log \
	--date=short \
    --pretty='format:{%n  "commit": "%h",%n  "author": "%an <%ae>",%n  "date": "%cd",%n  "message": "%s"%n},' \
    $@ | \
    perl -pe 'BEGIN{print "["}; END{print "]\n"}' | \
    perl -pe 's/},]/}]/' > ./pub/sites/home/changelog.json
   
git add .
git commit --amend --no-edit

git push -f heroku master

#git log --date=short --pretty='format:%h %s%n\t%cd, %an <%ae>'