const versionLink = document.getElementById("version");

const Version = {
	number: "0.0",
	prefix: "v"
};

function versionLinkUpdate() {
	versionLink.textContent = `${Version.prefix}${Version.number}`;
}

function versionNumber(val) {
	Version.number = val;
	versionLinkUpdate();
}

function versionPrefix(val) {
	Version.prefix = val;
	versionLinkUpdate();
}

function setVersion(prefix, number) {
	[Version.prefix, Version.number] = [prefix, number];
	versionLinkUpdate();
}

if (versionLink.tagName === "A") {
	versionLink.setAttribute("href", "./changelog.txt");
}

versionLinkUpdate();